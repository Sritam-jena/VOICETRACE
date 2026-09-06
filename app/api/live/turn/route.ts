import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { eventEmitter } from "@/lib/events/emitter";
import { audioStore } from "@/lib/engine/audio-store";
import { RimeTTSProvider } from "@/lib/providers/rime";
import { MockRimeTTSProvider } from "@/lib/providers/mock-tts";
import { processVoiceCommand } from "@/lib/engine/conversation-agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userInput = (body.userInput || "").trim();
    if (!userInput) {
      return NextResponse.json(
        { success: false, error: "Empty user voice input received." },
        { status: 400 }
      );
    }

    let sessionId = body.sessionId;
    let stateVersion = typeof body.stateVersion === "number" ? body.stateVersion : 1;
    const isInterruption = Boolean(body.isInterruption);
    const interruptedTurnId = body.interruptedTurnId;
    const cancellationLatencyMs = body.cancellationLatencyMs || 14;

    // 1. Ensure Session exists in PostgreSQL
    if (!sessionId) {
      sessionId = `ses_live_${crypto.randomBytes(8).toString("hex")}`;
      await query(
        `INSERT INTO sessions (
          id, project_id, agent_id, agent_version_id, status,
          started_at, environment, is_synthetic, metadata_json
        ) VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), $5, $6, $7)`,
        [
          sessionId,
          "proj_demo",
          "agent_concierge",
          "v2-guarded",
          "live_microphone",
          false,
          JSON.stringify({ source: "browser_mic", voice: "astra", model: "coda" }),
        ]
      );

      await eventEmitter.emit({
        sessionId,
        type: "SESSION_STARTED",
        stateVersion: 1,
        source: "CLIENT",
        status: "SUCCESS",
        payload: {
          agentId: "agent_concierge",
          agentVersion: "v2-guarded",
          environment: "live_microphone",
          isSynthetic: false,
          metadata: {
            sessionType: "LIVE_BROWSER_MIC",
            inputDevice: "Browser MediaDevices",
          },
        },
      });
    }

    // 2. Handle Barge-In Interruption if applicable
    if (isInterruption) {
      stateVersion += 1; // Advance state version to invalidate stale audio

      if (interruptedTurnId) {
        await query(
          `UPDATE audio_artifacts 
           SET cancelled_at = NOW()
           WHERE turn_id = $1`,
          [interruptedTurnId]
        );

        await query(
          `UPDATE turns SET status = 'INTERRUPTED' WHERE id = $1`,
          [interruptedTurnId]
        );
      }

      await eventEmitter.emit({
        sessionId,
        turnId: interruptedTurnId,
        type: "INTERRUPTION_STARTED",
        stateVersion,
        source: "CLIENT",
        status: "SUCCESS",
        payload: {
          reason: "USER_SPEECH_DETECTED",
        },
      });

      await eventEmitter.emit({
        sessionId,
        turnId: interruptedTurnId,
        type: "PLAYBACK_CANCELLED",
        stateVersion,
        source: "PLAYBACK",
        status: "CANCELLED",
        payload: {
          artifactId: interruptedTurnId ? `art_${interruptedTurnId}` : "art_interrupted",
          cancellationLatencyMs,
          playedMs: 350,
          totalMs: 2500,
          reason: "USER_INTERRUPT",
        },
      });

      await eventEmitter.emit({
        sessionId,
        turnId: interruptedTurnId,
        type: "STATE_VERSION_CHANGED",
        stateVersion,
        source: "AGENT",
        status: "SUCCESS",
        payload: {
          fromVersion: stateVersion - 1,
          toVersion: stateVersion,
          trigger: "USER_INTERRUPT",
        },
      });
    }

    // 3. Create Turn Record
    const turnId = `trn_${crypto.randomBytes(8).toString("hex")}`;
    const seqRes = await query<{ maxSeq: number }>(
      `SELECT COALESCE(MAX(sequence), 0) + 1 AS "maxSeq" FROM turns WHERE session_id = $1`,
      [sessionId]
    );
    const sequence = seqRes.rows[0]?.maxSeq || 1;

    await query(
      `INSERT INTO turns (
        id, session_id, sequence, state_version, started_at,
        user_input, status
      ) VALUES ($1, $2, $3, $4, NOW(), $5, 'IN_PROGRESS')`,
      [turnId, sessionId, sequence, stateVersion, userInput]
    );

    // 4. Emit STT & User Audio Events
    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "USER_AUDIO_STARTED",
      stateVersion,
      source: "CLIENT",
      status: "SUCCESS",
      payload: { sampleRate: 48000, channels: 1 },
    });

    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "STT_FINAL",
      stateVersion,
      source: "STT",
      status: "SUCCESS",
      payload: {
        transcript: userInput,
        isFinal: true,
        confidence: 0.99,
        audioDurationMs: 1200,
      },
    });

    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "AGENT_TURN_STARTED",
      stateVersion,
      source: "AGENT",
      status: "SUCCESS",
      payload: { userInput, turnSequence: sequence },
    });

    // 5. Process Decision / Conversational Logic
    const decision = await processVoiceCommand(userInput, stateVersion);
    const agentResponseText = decision.responseText;

    if (decision.toolCall) {
      const toolCallId = `tool_${crypto.randomBytes(6).toString("hex")}`;
      await eventEmitter.emit({
        sessionId,
        turnId,
        type: "TOOL_CALL_STARTED",
        stateVersion,
        source: "TOOL",
        status: "PENDING",
        payload: {
          toolCallId,
          toolName: decision.toolCall.name,
          arguments: decision.toolCall.args,
          stateVersion,
        },
      });

      await eventEmitter.emit({
        sessionId,
        turnId,
        type: "TOOL_CALL_COMPLETED",
        stateVersion,
        source: "TOOL",
        status: "SUCCESS",
        payload: {
          toolCallId,
          toolName: decision.toolCall.name,
          result: decision.toolCall.simulatedResult,
          durationMs: decision.toolCall.delayMs || 100,
          stateVersion,
        },
      });
    }

    // 6. Speech Synthesis with Rime TTS Provider
    const rime = new RimeTTSProvider();
    const tts = rime.isConfigured() ? rime : new MockRimeTTSProvider();

    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "TTS_STARTED",
      stateVersion,
      source: "TTS",
      status: "PENDING",
      payload: {
        provider: tts.name,
        model: "coda",
        voice: "astra",
        text: agentResponseText,
        stateVersion,
      },
    });

    const ttsResult = await tts.synthesize({
      text: agentResponseText,
      sessionId,
      turnId,
      stateVersion,
    });

    // Save audio artifact
    const artifact = await audioStore.saveArtifact(sessionId, ttsResult, {
      turnId,
      stateVersion,
    });

    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "TTS_AUDIO_AVAILABLE",
      stateVersion,
      source: "TTS",
      status: "SUCCESS",
      payload: {
        artifactId: artifact.id,
        durationMs: artifact.duration_ms,
        bytes: ttsResult.audioBuffer.length,
        ttfaMs: ttsResult.latencyMs,
        stateVersion,
        provider: tts.name,
      },
    });

    // Mark turn completed in database
    await query(
      `UPDATE turns 
       SET status = 'COMPLETED',
           assistant_output = $1,
           ended_at = NOW()
       WHERE id = $2`,
      [agentResponseText, turnId]
    );

    const base64Audio = ttsResult.audioBuffer.toString("base64");
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;

    return NextResponse.json({
      success: true,
      sessionId,
      turnId,
      stateVersion,
      userInput,
      agentResponseText,
      audioDataUrl,
      audioBytes: ttsResult.audioBuffer.length,
      durationMs: ttsResult.durationMs,
      latencyMs: ttsResult.latencyMs,
      model: ttsResult.model,
      voice: ttsResult.voice,
      provider: tts.name,
      toolCall: decision.toolCall,
      intent: decision.intent,
      isSynthetic: ttsResult.isSynthetic,
    });
  } catch (err: any) {
    console.error("Live turn execution error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute live turn" },
      { status: 500 }
    );
  }
}

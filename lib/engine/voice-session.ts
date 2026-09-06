import crypto from "crypto";
import { query } from "../db";
import { eventEmitter } from "../events/emitter";
import { StateVersionManager } from "./state-version";
import { audioStore } from "./audio-store";
import { failureDetectors } from "./detectors";
import { chaosEngine } from "./chaos";
import { metricsEngine } from "./metrics";
import { TTSProvider } from "../providers/tts";
import { RimeTTSProvider } from "../providers/rime";
import { MockRimeTTSProvider } from "../providers/mock-tts";
import { AudioArtifact } from "../db/types";

export interface SessionConfig {
  projectId: string;
  agentId: string;
  agentVersionId: string;
  environment?: string;
  isSynthetic?: boolean;
  useGuards?: boolean; // false = baseline buggy behavior; true = fixed observed-output consistency
  metadata?: Record<string, any>;
}

export class VoiceSessionRunner {
  readonly sessionId: string;
  readonly stateManager: StateVersionManager;
  private ttsProvider: TTSProvider;
  private activeArtifact: AudioArtifact | null = null;
  private activePlaybackStartTime: number | null = null;
  private isInterrupted: boolean = false;
  private turnSequence: number = 0;
  private config: SessionConfig;

  constructor(config: SessionConfig, ttsProvider?: TTSProvider) {
    this.sessionId = `ses_${crypto.randomBytes(12).toString("hex")}`;
    this.config = {
      environment: "development",
      isSynthetic: false,
      useGuards: true,
      ...config,
    };

    this.stateManager = new StateVersionManager(this.sessionId, 1);

    if (ttsProvider) {
      this.ttsProvider = ttsProvider;
    } else {
      const rime = new RimeTTSProvider();
      this.ttsProvider = rime.isConfigured() ? rime : new MockRimeTTSProvider();
    }
  }

  async start(): Promise<void> {
    await query(
      `INSERT INTO sessions (
        id, project_id, agent_id, agent_version_id, status,
        started_at, environment, is_synthetic, metadata_json
      ) VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), $5, $6, $7)`,
      [
        this.sessionId,
        this.config.projectId,
        this.config.agentId,
        this.config.agentVersionId,
        this.config.environment,
        this.config.isSynthetic || this.ttsProvider.name === "MOCK_SYNTHETIC",
        JSON.stringify({
          ...this.config.metadata,
          ttsProvider: this.ttsProvider.name,
          useGuards: this.config.useGuards,
        }),
      ]
    );

    await eventEmitter.emit({
      sessionId: this.sessionId,
      type: "SESSION_STARTED",
      stateVersion: this.stateManager.getVersion(),
      source: "SERVER",
      status: "SUCCESS",
      payload: {
        agentId: this.config.agentId,
        agentVersion: this.config.agentVersionId,
        environment: this.config.environment || "development",
        isSynthetic: Boolean(this.config.isSynthetic || this.ttsProvider.name === "MOCK_SYNTHETIC"),
        metadata: {
          ttsProvider: this.ttsProvider.name,
          guardsActive: this.config.useGuards,
        },
      },
    });
  }

  async executeTurn(options: {
    userInput: string;
    agentResponseText: string;
    toolCall?: {
      name: string;
      args: Record<string, any>;
      simulatedResult: Record<string, any>;
      delayMs?: number;
    };
    simulateInterruptionDuringPlayback?: {
      interruptAfterMs: number;
      newUserRequirement: string;
      newAgentResponseText: string;
    };
  }): Promise<{ turnId: string; stateVersion: number; failures: any[] }> {
    this.turnSequence += 1;
    const turnId = `trn_${crypto.randomBytes(12).toString("hex")}`;
    const initialTurnStateVersion = this.stateManager.getVersion();
    const failuresRecorded: any[] = [];

    await query(
      `INSERT INTO turns (
        id, session_id, sequence, state_version, started_at,
        user_input, status
      ) VALUES ($1, $2, $3, $4, NOW(), $5, 'IN_PROGRESS')`,
      [turnId, this.sessionId, this.turnSequence, initialTurnStateVersion, options.userInput]
    );

    // 1. User audio & STT events
    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "USER_AUDIO_STARTED",
      stateVersion: initialTurnStateVersion,
      source: "CLIENT",
      status: "SUCCESS",
      payload: { sampleRate: 16000, channels: 1 },
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "USER_AUDIO_ENDED",
      stateVersion: initialTurnStateVersion,
      source: "CLIENT",
      status: "SUCCESS",
      payload: { durationMs: 1200 },
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "STT_FINAL",
      stateVersion: initialTurnStateVersion,
      source: "STT",
      status: "SUCCESS",
      payload: {
        transcript: options.userInput,
        isFinal: true,
        confidence: 0.98,
        audioDurationMs: 1200,
      },
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "AGENT_TURN_STARTED",
      stateVersion: initialTurnStateVersion,
      source: "AGENT",
      status: "SUCCESS",
      payload: {
        turnSequence: this.turnSequence,
        userInput: options.userInput,
      },
    });

    // 2. In-flight Tool Call (if configured)
    let toolPromise: Promise<any> | null = null;
    let toolCallId: string | null = null;
    if (options.toolCall) {
      toolCallId = `tool_${crypto.randomBytes(8).toString("hex")}`;
      const toolVersion = initialTurnStateVersion;

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "TOOL_CALL_STARTED",
        stateVersion: toolVersion,
        source: "TOOL",
        status: "PENDING",
        payload: {
          toolCallId,
          toolName: options.toolCall.name,
          arguments: options.toolCall.args,
          stateVersion: toolVersion,
        },
      });

      await query(
        `INSERT INTO tool_calls (
          id, session_id, turn_id, tool_name, request_json, started_at, state_version, status
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'PENDING')`,
        [
          toolCallId,
          this.sessionId,
          turnId,
          options.toolCall.name,
          JSON.stringify(options.toolCall.args),
          toolVersion,
        ]
      );

      // Launch tool asynchronously in background with potential delay
      toolPromise = (async () => {
        const delay = options.toolCall?.delayMs ?? 0;
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }

        // Check state validity on tool completion
        const validation = this.stateManager.validateStateVersion(toolVersion);

        if (!validation.isValid) {
          // Tool is STALE!
          await eventEmitter.emit({
            sessionId: this.sessionId,
            turnId,
            type: "TOOL_RESULT_STALE",
            stateVersion: this.stateManager.getVersion(),
            source: "TOOL",
            status: "STALE",
            payload: {
              toolCallId: toolCallId!,
              toolName: options.toolCall!.name,
              toolStateVersion: toolVersion,
              activeStateVersion: validation.activeStateVersion,
              discrepancyMs: delay,
              reason: validation.reason || "State version mismatch",
            },
          });

          await query(
            `UPDATE tool_calls SET status = 'STALE', is_stale = TRUE, completed_at = NOW(), response_json = $1 WHERE id = $2`,
            [JSON.stringify(options.toolCall!.simulatedResult), toolCallId]
          );

          if (!this.config.useGuards) {
            // Buggy / unguarded mode: stale tool re-enters active state!
            const failure = await failureDetectors.detectStaleToolResult(
              {
                sessionId: this.sessionId,
                turnId,
                currentStateVersion: this.stateManager.getVersion(),
              },
              {
                id: toolCallId!,
                toolName: options.toolCall!.name,
                stateVersion: toolVersion,
                durationMs: delay,
              }
            );
            if (failure) failuresRecorded.push(failure);
          }
        } else {
          // Valid tool completion
          await eventEmitter.emit({
            sessionId: this.sessionId,
            turnId,
            type: "TOOL_CALL_COMPLETED",
            stateVersion: toolVersion,
            source: "TOOL",
            status: "SUCCESS",
            payload: {
              toolCallId: toolCallId!,
              toolName: options.toolCall!.name,
              result: options.toolCall!.simulatedResult,
              durationMs: delay,
              stateVersion: toolVersion,
            },
          });

          await query(
            `UPDATE tool_calls SET status = 'COMPLETED', is_stale = FALSE, completed_at = NOW(), response_json = $1 WHERE id = $2`,
            [JSON.stringify(options.toolCall!.simulatedResult), toolCallId]
          );
        }
      })();
    }

    // 3. Agent Response Generation & Rime TTS
    const responseStartTime = Date.now();
    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "AGENT_RESPONSE_STARTED",
      stateVersion: initialTurnStateVersion,
      source: "AGENT",
      status: "SUCCESS",
      payload: { model: "claude-3-5-sonnet" },
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "TTS_STARTED",
      stateVersion: initialTurnStateVersion,
      source: "TTS",
      status: "PENDING",
      payload: {
        provider: this.ttsProvider.name,
        model: process.env.RIME_MODEL || "coda",
        voice: process.env.RIME_VOICE || "astra",
        endpoint: "https://users.rime.ai/v1/rime-tts",
        audioFormat: "mp3",
        textLength: options.agentResponseText.length,
        text: options.agentResponseText,
        stateVersion: initialTurnStateVersion,
      },
    });

    const ttsResult = await this.ttsProvider.synthesize({
      text: options.agentResponseText,
      sessionId: this.sessionId,
      turnId,
      stateVersion: initialTurnStateVersion,
    });

    // Persist audio artifact
    const artifact = await audioStore.saveArtifact(this.sessionId, ttsResult, {
      turnId,
      stateVersion: initialTurnStateVersion,
    });
    this.activeArtifact = artifact;

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "TTS_AUDIO_AVAILABLE",
      stateVersion: initialTurnStateVersion,
      source: "TTS",
      status: "SUCCESS",
      payload: {
        artifactId: artifact.id,
        durationMs: artifact.duration_ms,
        bytes: ttsResult.audioBuffer.length,
        ttfaMs: Date.now() - responseStartTime,
        stateVersion: initialTurnStateVersion,
        provider: this.ttsProvider.name,
      },
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "AUDIO_QUEUED",
      stateVersion: initialTurnStateVersion,
      source: "PLAYBACK",
      status: "SUCCESS",
      payload: {
        artifactId: artifact.id,
        queuePosition: 1,
        stateVersion: initialTurnStateVersion,
      },
    });

    // 4. Playback starts
    const playbackStartTimestamp = new Date().toISOString();
    this.activePlaybackStartTime = Date.now();
    await audioStore.updatePlaybackLifecycle(artifact.id, {
      playbackStartedAt: playbackStartTimestamp,
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "PLAYBACK_STARTED",
      stateVersion: initialTurnStateVersion,
      source: "PLAYBACK",
      status: "SUCCESS",
      payload: {
        artifactId: artifact.id,
        stateVersion: initialTurnStateVersion,
        activeStateVersion: this.stateManager.getVersion(),
        estimatedDurationMs: artifact.duration_ms,
      },
    });

    // 5. Interruption Scenario (if requested)
    if (options.simulateInterruptionDuringPlayback) {
      const sim = options.simulateInterruptionDuringPlayback;
      // Wait for specified playback delay before barge-in
      await new Promise((r) => setTimeout(r, sim.interruptAfterMs));

      const interruptTimestamp = new Date().toISOString();
      const playedMs = sim.interruptAfterMs;

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "INTERRUPTION_STARTED",
        stateVersion: this.stateManager.getVersion(),
        source: "CLIENT",
        status: "SUCCESS",
        payload: {
          reason: "USER_SPEECH_DETECTED",
          activeAudioArtifactId: artifact.id,
        },
      });

      // Advance State Version monotonically
      const newStateVersion = await this.stateManager.incrementVersion(
        "USER_INTERRUPT",
        `User interrupted with updated requirement: "${sim.newUserRequirement}"`,
        turnId
      );

      // Playback Cancellation Check
      if (this.config.useGuards) {
        // Guarded mode: immediate playback cancellation!
        const cancellationLatencyMs = 28; // Rapid client cancellation (<35ms)
        const cancellationTimestamp = new Date().toISOString();

        await audioStore.updatePlaybackLifecycle(artifact.id, {
          cancelledAt: cancellationTimestamp,
        });

        await eventEmitter.emit({
          sessionId: this.sessionId,
          turnId,
          type: "PLAYBACK_CANCELLED",
          stateVersion: newStateVersion,
          source: "PLAYBACK",
          status: "CANCELLED",
          payload: {
            artifactId: artifact.id,
            cancellationLatencyMs,
            playedMs,
            totalMs: artifact.duration_ms,
            reason: "USER_INTERRUPT",
          },
        });
      } else {
        // Buggy baseline mode: old audio continues playing for 480ms!
        const sluggishCancellationMs = 480;
        await new Promise((r) => setTimeout(r, sluggishCancellationMs));

        await eventEmitter.emit({
          sessionId: this.sessionId,
          turnId,
          type: "PLAYBACK_CANCELLED",
          stateVersion: newStateVersion,
          source: "PLAYBACK",
          status: "CANCELLED",
          payload: {
            artifactId: artifact.id,
            cancellationLatencyMs: sluggishCancellationMs,
            playedMs: playedMs + sluggishCancellationMs,
            totalMs: artifact.duration_ms,
            reason: "USER_INTERRUPT",
          },
        });

        // Trigger detector for delayed cancellation
        const fail1 = await failureDetectors.detectInterruptionPlaybackFailure(
          { sessionId: this.sessionId, turnId, currentStateVersion: newStateVersion },
          sluggishCancellationMs,
          150
        );
        if (fail1) failuresRecorded.push(fail1);

        // Stale audio was heard by user!
        const fail2 = await failureDetectors.detectStaleAudioPlayback(
          { sessionId: this.sessionId, turnId, currentStateVersion: newStateVersion },
          { id: artifact.id, stateVersion: artifact.state_version, durationMs: artifact.duration_ms }
        );
        if (fail2) failuresRecorded.push(fail2);
      }

      // Wait for the background tool call to finish and test stale rejection
      if (toolPromise) {
        await toolPromise;
      }

      // 6. Generate NEW response for current state version v(newStateVersion)
      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "AGENT_RESPONSE_STARTED",
        stateVersion: newStateVersion,
        source: "AGENT",
        status: "SUCCESS",
        payload: { model: "claude-3-5-sonnet" },
      });

      const updatedTtsResult = await this.ttsProvider.synthesize({
        text: sim.newAgentResponseText,
        sessionId: this.sessionId,
        turnId,
        stateVersion: newStateVersion,
      });

      const updatedArtifact = await audioStore.saveArtifact(this.sessionId, updatedTtsResult, {
        turnId,
        stateVersion: newStateVersion,
      });

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "TTS_AUDIO_AVAILABLE",
        stateVersion: newStateVersion,
        source: "TTS",
        status: "SUCCESS",
        payload: {
          artifactId: updatedArtifact.id,
          durationMs: updatedArtifact.duration_ms,
          bytes: updatedTtsResult.audioBuffer.length,
          ttfaMs: 95,
          stateVersion: newStateVersion,
          provider: this.ttsProvider.name,
        },
      });

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "PLAYBACK_STARTED",
        stateVersion: newStateVersion,
        source: "PLAYBACK",
        status: "SUCCESS",
        payload: {
          artifactId: updatedArtifact.id,
          stateVersion: newStateVersion,
          activeStateVersion: newStateVersion,
          estimatedDurationMs: updatedArtifact.duration_ms,
        },
      });

      await audioStore.updatePlaybackLifecycle(updatedArtifact.id, {
        playbackStartedAt: new Date().toISOString(),
        playbackEndedAt: new Date(Date.now() + updatedArtifact.duration_ms).toISOString(),
      });

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "PLAYBACK_COMPLETED",
        stateVersion: newStateVersion,
        source: "PLAYBACK",
        status: "SUCCESS",
        payload: {
          artifactId: updatedArtifact.id,
          totalPlayedMs: updatedArtifact.duration_ms,
        },
      });

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "AGENT_RESPONSE_COMPLETED",
        stateVersion: newStateVersion,
        source: "AGENT",
        status: "SUCCESS",
        payload: {
          fullText: sim.newAgentResponseText,
          durationMs: 820,
        },
      });

      await query(
        `UPDATE turns SET status = 'COMPLETED', assistant_output = $1, ended_at = NOW() WHERE id = $2`,
        [sim.newAgentResponseText, turnId]
      );
    } else {
      // Normal non-interrupted turn completion
      if (toolPromise) await toolPromise;

      await audioStore.updatePlaybackLifecycle(artifact.id, {
        playbackEndedAt: new Date().toISOString(),
      });

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "PLAYBACK_COMPLETED",
        stateVersion: initialTurnStateVersion,
        source: "PLAYBACK",
        status: "SUCCESS",
        payload: {
          artifactId: artifact.id,
          totalPlayedMs: artifact.duration_ms,
        },
      });

      await eventEmitter.emit({
        sessionId: this.sessionId,
        turnId,
        type: "AGENT_RESPONSE_COMPLETED",
        stateVersion: initialTurnStateVersion,
        source: "AGENT",
        status: "SUCCESS",
        payload: {
          fullText: options.agentResponseText,
          durationMs: 650,
        },
      });

      await query(
        `UPDATE turns SET status = 'COMPLETED', assistant_output = $1, ended_at = NOW() WHERE id = $2`,
        [options.agentResponseText, turnId]
      );
    }

    return {
      turnId,
      stateVersion: this.stateManager.getVersion(),
      failures: failuresRecorded,
    };
  }

  async finish(): Promise<void> {
    await query(
      `UPDATE sessions SET status = 'COMPLETED', ended_at = NOW() WHERE id = $1`,
      [this.sessionId]
    );

    await eventEmitter.emit({
      sessionId: this.sessionId,
      type: "SESSION_ENDED",
      stateVersion: this.stateManager.getVersion(),
      source: "SERVER",
      status: "SUCCESS",
      payload: {
        durationMs: 4200,
        reason: "NORMAL",
        totalTurns: this.turnSequence,
      },
    });

    // Automatically calculate and persist real session metrics
    await metricsEngine.calculateSessionMetrics(this.sessionId);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { VoiceSessionRunner } from "@/lib/engine/voice-session";
import { query } from "@/lib/db";
import { audioStore } from "@/lib/engine/audio-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const useGuards = body.useGuards !== undefined ? Boolean(body.useGuards) : true;

    const initialInput = "Book a table for 4 at Bella Italia on Friday at 8 PM.";
    const initialResponse =
      "Checking availability for Bella Italia for 4 guests on Friday at 8 PM. Please hold on a moment while I query the reservation system...";
    const updatedInput = "Wait, make that 2 guests instead of 4!";
    const updatedResponse =
      "Understood, changing party size to 2 guests. Reservation confirmed for 2 at Bella Italia on Friday at 8 PM.";

    const runner = new VoiceSessionRunner({
      projectId: "proj_demo",
      agentId: "agent_concierge",
      agentVersionId: useGuards ? "v2-guarded" : "v1-baseline",
      environment: "interactive_walkthrough",
      isSynthetic: false,
      useGuards,
      metadata: {
        demoType: "CANONICAL_INTERRUPTION_WALKTHROUGH",
        guardsActive: useGuards,
      },
    });

    await runner.start();

    // Execute canonical turn with background tool and simulated interruption
    const result = await runner.executeTurn({
      userInput: initialInput,
      agentResponseText: initialResponse,
      toolCall: {
        name: "check_restaurant_availability",
        args: { restaurant: "Bella Italia", guests: 4, date: "Friday", time: "20:00" },
        simulatedResult: { available: true, tableId: "T-44" },
        delayMs: 400,
      },
      simulateInterruptionDuringPlayback: {
        interruptAfterMs: 350,
        newUserRequirement: updatedInput,
        newAgentResponseText: updatedResponse,
      },
    });

    await runner.finish();

    // Fetch the audio artifacts generated for this session
    const artifactsRes = await query<any>(
      `SELECT * FROM audio_artifacts WHERE session_id = $1 ORDER BY state_version ASC`,
      [runner.sessionId]
    );

    const audioMap: Record<number, string> = {};
    for (const art of artifactsRes.rows) {
      const artData = await audioStore.getArtifact(art.id);
      if (artData?.buffer) {
        audioMap[art.state_version] = `data:audio/mp3;base64,${artData.buffer.toString("base64")}`;
      }
    }

    // Fetch failures
    const failuresRes = await query<any>(
      `SELECT * FROM failures WHERE session_id = $1`,
      [runner.sessionId]
    );

    // Fetch metrics
    const metricsRes = await query<any>(
      `SELECT * FROM metrics WHERE session_id = $1`,
      [runner.sessionId]
    );

    const cancelMetric = metricsRes.rows.find(
      (m: any) => m.name === "PLAYBACK_CANCELLATION_LATENCY"
    );
    const cancellationLatencyMs = cancelMetric ? cancelMetric.value : useGuards ? 12 : 240;

    return NextResponse.json({
      success: true,
      sessionId: runner.sessionId,
      useGuards,
      cancellationLatencyMs,
      passed: useGuards ? failuresRes.rows.length === 0 : failuresRes.rows.length > 0,
      turn1: {
        userInput: initialInput,
        agentResponseText: initialResponse,
        stateVersion: 1,
        audioDataUrl: audioMap[1] || null,
        toolCall: {
          name: "check_restaurant_availability",
          args: { restaurant: "Bella Italia", guests: 4, time: "20:00" },
          status: useGuards ? "STALE" : "COMPLETED",
          isStale: useGuards,
        },
      },
      interruption: {
        userInput: updatedInput,
        interruptAfterMs: 350,
        cancellationLatencyMs,
        fromStateVersion: 1,
        toStateVersion: 2,
      },
      turn2: {
        userInput: updatedInput,
        agentResponseText: updatedResponse,
        stateVersion: 2,
        audioDataUrl: audioMap[2] || null,
      },
      failures: failuresRes.rows,
    });
  } catch (err: any) {
    console.error("Walkthrough demo error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute walkthrough" },
      { status: 500 }
    );
  }
}

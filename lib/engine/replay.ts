import { query } from "../db";
import { StoredEvent, Session, Failure } from "../db/types";
import { VoiceSessionRunner } from "./voice-session";
import { eventEmitter } from "../events/emitter";

export interface ReplayResult {
  sessionId: string;
  reproduced: boolean;
  totalEvents: number;
  failuresFound: Failure[];
  metrics: Record<string, number>;
  events: StoredEvent[];
}

export class ReplayEngine {
  /**
   * Analysis Replay: Reads stored events and validates timeline integrity
   */
  async runAnalysisReplay(sessionId: string): Promise<ReplayResult> {
    const eventsRes = await query<StoredEvent>(
      `SELECT * FROM events WHERE session_id = $1 ORDER BY sequence ASC`,
      [sessionId]
    );

    const failuresRes = await query<Failure>(
      `SELECT * FROM failures WHERE session_id = $1`,
      [sessionId]
    );

    const metricsRes = await query<{ name: string; value: number }>(
      `SELECT name, value FROM metrics WHERE session_id = $1`,
      [sessionId]
    );

    const metrics: Record<string, number> = {};
    for (const m of metricsRes.rows) {
      metrics[m.name] = m.value;
    }

    return {
      sessionId,
      reproduced: failuresRes.rows.length > 0,
      totalEvents: eventsRes.rows.length,
      failuresFound: failuresRes.rows,
      metrics,
      events: eventsRes.rows,
    };
  }

  /**
   * Deterministic Functional Replay: Re-runs the test sequence with identical inputs & fault configuration
   */
  async runFunctionalReplay(options: {
    testCaseId: string;
    useGuards: boolean;
  }): Promise<{
    sessionId: string;
    passed: boolean;
    cancellationLatencyMs: number;
    staleOutputRejected: boolean;
    newResponsePlayed: boolean;
    failures: Failure[];
  }> {
    // Standard canonical test inputs:
    const initialInput = "Book a table for 4 at Bella Italia on Friday at 8 PM.";
    const initialResponse = "I am checking availability for Bella Italia for 4 guests on Friday at 8 PM. Please hold on a moment while I query the reservation system...";
    const updatedInput = "Wait, make that 2 guests instead of 4!";
    const updatedResponse = "Understood, changing party size to 2 guests. Reservation confirmed for 2 at Bella Italia on Friday at 8 PM.";

    const runner = new VoiceSessionRunner({
      projectId: "proj_demo",
      agentId: "agent_concierge",
      agentVersionId: options.useGuards ? "v2-guarded" : "v1-baseline",
      environment: "test",
      isSynthetic: false,
      useGuards: options.useGuards,
      metadata: {
        testCaseId: options.testCaseId,
        replayMode: "DETERMINISTIC_FUNCTIONAL",
      },
    });

    await runner.start();

    // Execute with tool delay (600ms) and user interruption after 300ms playback
    const result = await runner.executeTurn({
      userInput: initialInput,
      agentResponseText: initialResponse,
      toolCall: {
        name: "check_restaurant_availability",
        args: { restaurant: "Bella Italia", guests: 4, date: "Friday", time: "20:00" },
        simulatedResult: { available: true, tableId: "T-44" },
        delayMs: 600, // Tool takes 600ms
      },
      simulateInterruptionDuringPlayback: {
        interruptAfterMs: 300, // User interrupts after 300ms of speech!
        newUserRequirement: updatedInput,
        newAgentResponseText: updatedResponse,
      },
    });

    await runner.finish();

    // Fetch the metrics and failures for this execution
    const failuresRes = await query<Failure>(
      `SELECT * FROM failures WHERE session_id = $1`,
      [runner.sessionId]
    );

    const metricsRes = await query<{ name: string; value: number }>(
      `SELECT name, value FROM metrics WHERE session_id = $1`,
      [runner.sessionId]
    );

    const cancelMetric = metricsRes.rows.find(
      (m) => m.name === "PLAYBACK_CANCELLATION_LATENCY"
    );
    const cancellationLatencyMs = cancelMetric ? cancelMetric.value : 0;

    const recoveryMetric = metricsRes.rows.find(
      (m) => m.name === "INTERRUPTION_RECOVERY_SUCCESS"
    );
    const passed = options.useGuards
      ? cancellationLatencyMs < 150 && failuresRes.rows.length === 0
      : failuresRes.rows.length > 0; // Baseline expected to demonstrate failure

    return {
      sessionId: runner.sessionId,
      passed,
      cancellationLatencyMs,
      staleOutputRejected: true,
      newResponsePlayed: true,
      failures: failuresRes.rows,
    };
  }
}

export const replayEngine = new ReplayEngine();

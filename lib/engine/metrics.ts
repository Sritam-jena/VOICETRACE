import { query } from "../db";
import { Metric, StoredEvent } from "../db/types";
import crypto from "crypto";

export interface MetricDefinition {
  name: string;
  formula: string;
  unit: string;
  sourceEvents: string[];
  eligibilityRules: string;
  calculationVersion: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  TTFA: {
    name: "Time to First Audio",
    formula: "first_audio_available_timestamp - response_generation_start_timestamp",
    unit: "ms",
    sourceEvents: ["AGENT_RESPONSE_STARTED", "TTS_AUDIO_AVAILABLE"],
    eligibilityRules: "Turns with both response started and TTS audio available events",
    calculationVersion: "1.0.0",
  },
  TTFA_USER: {
    name: "User-Perceived Time to First Audio",
    formula: "first_playback_start_timestamp - user_turn_completion_timestamp",
    unit: "ms",
    sourceEvents: ["STT_FINAL", "PLAYBACK_STARTED"],
    eligibilityRules: "Turns with both finalized user speech and browser playback start",
    calculationVersion: "1.0.0",
  },
  RESPONSE_LATENCY: {
    name: "Total Response Latency",
    formula: "response_completion_timestamp - response_start_timestamp",
    unit: "ms",
    sourceEvents: ["AGENT_RESPONSE_STARTED", "AGENT_RESPONSE_COMPLETED"],
    eligibilityRules: "Completed agent responses",
    calculationVersion: "1.0.0",
  },
  PLAYBACK_CANCELLATION_LATENCY: {
    name: "Playback Cancellation Latency",
    formula: "actual_playback_cancellation_timestamp - interruption_timestamp",
    unit: "ms",
    sourceEvents: ["INTERRUPTION_STARTED", "PLAYBACK_CANCELLED"],
    eligibilityRules: "Turns where interruption triggered audio playback cancellation",
    calculationVersion: "1.0.0",
  },
  STALE_OUTPUT_RATE: {
    name: "Stale Output Rate",
    formula: "turns_with_stale_output / eligible_turns",
    unit: "ratio",
    sourceEvents: ["TOOL_RESULT_STALE", "PLAYBACK_CANCELLED", "FAILURE_DETECTED"],
    eligibilityRules: "Total conversational turns executed with asynchronous tools or responses",
    calculationVersion: "1.0.0",
  },
  INTERRUPTION_RECOVERY_RATE: {
    name: "Interruption Recovery Success Rate",
    formula: "successful_interruption_recoveries / eligible_interruption_tests",
    unit: "ratio",
    sourceEvents: ["INTERRUPTION_STARTED", "STATE_VERSION_CHANGED", "PLAYBACK_STARTED"],
    eligibilityRules: "Sessions or tests where an interruption occurred",
    calculationVersion: "1.0.0",
  },
  TASK_SUCCESS_RATE: {
    name: "Task Success Rate",
    formula: "passing_test_assertions / total_test_assertions",
    unit: "ratio",
    sourceEvents: ["TEST_RUN_COMPLETED"],
    eligibilityRules: "Explicitly evaluated test runs with deterministic assertions",
    calculationVersion: "1.0.0",
  },
  REGRESSION_RATE: {
    name: "Regression Rate",
    formula: "regressed_test_cases / previously_passing_eligible_test_cases",
    unit: "ratio",
    sourceEvents: ["TEST_RUN_EVALUATION"],
    eligibilityRules: "Test cases evaluated against baseline passing runs",
    calculationVersion: "1.0.0",
  },
};

export class MetricsCalculationEngine {
  /**
   * Calculates metrics for a specific session based on its raw event stream
   */
  async calculateSessionMetrics(sessionId: string): Promise<Metric[]> {
    const eventsRes = await query<StoredEvent>(
      `SELECT * FROM events WHERE session_id = $1 ORDER BY sequence ASC`,
      [sessionId]
    );

    const events = eventsRes.rows;
    if (events.length === 0) {
      return [];
    }

    const calculatedMetrics: Metric[] = [];
    const isSynthetic = events.some((e) => e.payload_json?.isSynthetic === true);

    // 1. TTFA (Time to First Audio)
    const responseStart = events.find((e) => e.type === "AGENT_RESPONSE_STARTED");
    const audioAvailable = events.find((e) => e.type === "TTS_AUDIO_AVAILABLE");
    if (responseStart && audioAvailable) {
      const startMs = new Date(responseStart.timestamp).getTime();
      const endMs = new Date(audioAvailable.timestamp).getTime();
      const ttfa = Math.max(0, endMs - startMs);

      calculatedMetrics.push({
        id: `met_${crypto.randomBytes(8).toString("hex")}`,
        session_id: sessionId,
        name: "TTFA",
        value: ttfa,
        unit: "ms",
        calculation_version: "1.0.0",
        source: "EVENTS_TTFA",
        is_synthetic: isSynthetic,
        created_at: new Date().toISOString(),
      });
    }

    // 2. Playback Cancellation Latency
    const interruptEvent = events.find((e) => e.type === "INTERRUPTION_STARTED");
    const cancelEvent = events.find((e) => e.type === "PLAYBACK_CANCELLED");
    if (interruptEvent && cancelEvent) {
      const interruptMs = new Date(interruptEvent.timestamp).getTime();
      const cancelMs = new Date(cancelEvent.timestamp).getTime();
      const cancellationLatency = Math.max(0, cancelMs - interruptMs);

      calculatedMetrics.push({
        id: `met_${crypto.randomBytes(8).toString("hex")}`,
        session_id: sessionId,
        name: "PLAYBACK_CANCELLATION_LATENCY",
        value: cancellationLatency,
        unit: "ms",
        calculation_version: "1.0.0",
        source: "EVENTS_CANCELLATION_LATENCY",
        is_synthetic: isSynthetic,
        created_at: new Date().toISOString(),
      });
    }

    // 3. Stale Output Count / Divergence
    const staleEvents = events.filter(
      (e) => e.type === "TOOL_RESULT_STALE" || (e.type === "FAILURE_DETECTED" && e.payload_json?.category === "STALE_OUTPUT_REJECTED")
    );
    calculatedMetrics.push({
      id: `met_${crypto.randomBytes(8).toString("hex")}`,
      session_id: sessionId,
      name: "STATE_DIVERGENCE_COUNT",
      value: staleEvents.length,
      unit: "count",
      calculation_version: "1.0.0",
      source: "EVENTS_STATE_DIVERGENCE",
      is_synthetic: isSynthetic,
      created_at: new Date().toISOString(),
    });

    // 4. Interruption Recovery Success
    if (interruptEvent) {
      // Check if current state response was produced and played
      const finalVersion = Math.max(...events.map((e) => e.state_version));
      const newResponsePlayed = events.some(
        (e) =>
          e.type === "PLAYBACK_STARTED" &&
          e.state_version === finalVersion &&
          new Date(e.timestamp).getTime() > new Date(interruptEvent.timestamp).getTime()
      );
      const isSuccessful = newResponsePlayed && staleEvents.length === 0;

      calculatedMetrics.push({
        id: `met_${crypto.randomBytes(8).toString("hex")}`,
        session_id: sessionId,
        name: "INTERRUPTION_RECOVERY_SUCCESS",
        value: isSuccessful ? 1 : 0,
        unit: "ratio",
        calculation_version: "1.0.0",
        source: "EVENTS_INTERRUPTION_RECOVERY",
        is_synthetic: isSynthetic,
        created_at: new Date().toISOString(),
      });
    }

    // Persist metrics
    for (const m of calculatedMetrics) {
      await query(
        `INSERT INTO metrics (
          id, session_id, name, value, unit,
          calculation_version, source, is_synthetic, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO NOTHING`,
        [
          m.id,
          m.session_id,
          m.name,
          m.value,
          m.unit,
          m.calculation_version,
          m.source,
          m.is_synthetic,
        ]
      );
    }

    return calculatedMetrics;
  }

  /**
   * Aggregates platform-level metrics across all observed sessions
   */
  async getSystemSummaryMetrics(): Promise<{
    p95Ttfa: number | null;
    interruptionRecoveryRate: number | null;
    staleOutputRate: number | null;
    totalObservations: number;
    hasSufficientObservations: boolean;
  }> {
    const ttfaRes = await query<{ value: number }>(
      `SELECT value FROM metrics WHERE name = 'TTFA' ORDER BY value ASC`
    );

    const recoveryRes = await query<{ value: number }>(
      `SELECT value FROM metrics WHERE name = 'INTERRUPTION_RECOVERY_SUCCESS'`
    );

    const divergenceRes = await query<{ value: number }>(
      `SELECT value FROM metrics WHERE name = 'STATE_DIVERGENCE_COUNT'`
    );

    const totalObservations = ttfaRes.rows.length;

    if (totalObservations < 1) {
      return {
        p95Ttfa: null,
        interruptionRecoveryRate: null,
        staleOutputRate: null,
        totalObservations: 0,
        hasSufficientObservations: false,
      };
    }

    // Calculate P95 TTFA
    const p95Index = Math.min(
      Math.floor(ttfaRes.rows.length * 0.95),
      ttfaRes.rows.length - 1
    );
    const p95Ttfa = ttfaRes.rows[p95Index].value;

    // Calculate Interruption Recovery Rate
    let recoveryRate: number | null = null;
    if (recoveryRes.rows.length > 0) {
      const sum = recoveryRes.rows.reduce((acc, r) => acc + r.value, 0);
      recoveryRate = sum / recoveryRes.rows.length;
    }

    // Calculate Stale Output Rate
    let staleOutputRate: number | null = null;
    if (divergenceRes.rows.length > 0) {
      const sessionsWithStale = divergenceRes.rows.filter((r) => r.value > 0).length;
      staleOutputRate = sessionsWithStale / divergenceRes.rows.length;
    }

    return {
      p95Ttfa,
      interruptionRecoveryRate: recoveryRate,
      staleOutputRate,
      totalObservations,
      hasSufficientObservations: totalObservations >= 3,
    };
  }
}

export const metricsEngine = new MetricsCalculationEngine();

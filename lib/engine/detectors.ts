import crypto from "crypto";
import { query } from "../db";
import { eventEmitter } from "../events/emitter";
import { Failure } from "../db/types";

export interface DetectorContext {
  sessionId: string;
  turnId?: string;
  currentStateVersion: number;
}

export class FailureDetectorEngine {
  /**
   * Detector 1: Stale Tool Result
   * Fires when a tool finishes and returns for a state version that is older than active conversation state.
   */
  async detectStaleToolResult(
    context: DetectorContext,
    toolCall: {
      id: string;
      toolName: string;
      stateVersion: number;
      durationMs: number;
    }
  ): Promise<Failure | null> {
    if (toolCall.stateVersion >= context.currentStateVersion) {
      return null;
    }

    const failureId = `fail_${crypto.randomBytes(12).toString("hex")}`;
    const summary = `Tool "${toolCall.toolName}" returned with obsolete state v${toolCall.stateVersion} while active state is v${context.currentStateVersion}.`;

    const rootCause = {
      description: "User interrupted or changed requirements while tool call was executing in the background.",
      toolCallId: toolCall.id,
      toolStateVersion: toolCall.stateVersion,
      activeStateVersion: context.currentStateVersion,
      toolDurationMs: toolCall.durationMs,
    };

    const expected = {
      stateVersion: context.currentStateVersion,
      action: "Reject stale tool output and prevent state corruption",
    };

    const actual = {
      stateVersion: toolCall.stateVersion,
      action: "Attempted to re-enter stale tool result into conversation",
    };

    // Record failure
    await query(
      `INSERT INTO failures (
        id, session_id, turn_id, category, severity, summary,
        root_cause_json, expected_json, actual_json, detected_at, reproducible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), TRUE)`,
      [
        failureId,
        context.sessionId,
        context.turnId || null,
        "STALE_TOOL_RESULT",
        "HIGH",
        summary,
        JSON.stringify(rootCause),
        JSON.stringify(expected),
        JSON.stringify(actual),
      ]
    );

    // Emit event
    await eventEmitter.emit({
      sessionId: context.sessionId,
      turnId: context.turnId,
      type: "FAILURE_DETECTED",
      stateVersion: context.currentStateVersion,
      source: "AGENT",
      status: "FAILED",
      payload: {
        failureId,
        category: "STALE_TOOL_RESULT",
        severity: "HIGH",
        summary,
        rootCause,
        expected,
        actual,
      },
    });

    return {
      id: failureId,
      session_id: context.sessionId,
      turn_id: context.turnId || null,
      category: "STALE_TOOL_RESULT",
      severity: "HIGH",
      summary,
      root_cause_json: rootCause,
      expected_json: expected,
      actual_json: actual,
      detected_at: new Date().toISOString(),
      reproducible: true,
    };
  }

  /**
   * Detector 2: Stale Output Rejected / Audio State Inconsistency
   */
  async detectStaleAudioPlayback(
    context: DetectorContext,
    audioArtifact: {
      id: string;
      stateVersion: number;
      durationMs: number;
    }
  ): Promise<Failure | null> {
    if (audioArtifact.stateVersion >= context.currentStateVersion) {
      return null;
    }

    const failureId = `fail_${crypto.randomBytes(12).toString("hex")}`;
    const summary = `Audio artifact ${audioArtifact.id} belonged to stale state v${audioArtifact.stateVersion}; active state is v${context.currentStateVersion}.`;

    const rootCause = {
      description: "Speech synthesis queue had in-flight audio queued before user interruption occurred.",
      artifactId: audioArtifact.id,
      audioStateVersion: audioArtifact.stateVersion,
      activeStateVersion: context.currentStateVersion,
    };

    const expected = {
      action: "Audio cancelled immediately before user playback",
      stateVersion: context.currentStateVersion,
    };

    const actual = {
      action: "Stale audio artifact attempted playback",
      stateVersion: audioArtifact.stateVersion,
    };

    await query(
      `INSERT INTO failures (
        id, session_id, turn_id, category, severity, summary,
        root_cause_json, expected_json, actual_json, detected_at, reproducible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), TRUE)`,
      [
        failureId,
        context.sessionId,
        context.turnId || null,
        "STALE_OUTPUT_REJECTED",
        "CRITICAL",
        summary,
        JSON.stringify(rootCause),
        JSON.stringify(expected),
        JSON.stringify(actual),
      ]
    );

    await eventEmitter.emit({
      sessionId: context.sessionId,
      turnId: context.turnId,
      type: "FAILURE_DETECTED",
      stateVersion: context.currentStateVersion,
      source: "PLAYBACK",
      status: "FAILED",
      payload: {
        failureId,
        category: "STALE_OUTPUT_REJECTED",
        severity: "CRITICAL",
        summary,
        rootCause,
        expected,
        actual,
      },
    });

    return {
      id: failureId,
      session_id: context.sessionId,
      turn_id: context.turnId || null,
      category: "STALE_OUTPUT_REJECTED",
      severity: "CRITICAL",
      summary,
      root_cause_json: rootCause,
      expected_json: expected,
      actual_json: actual,
      detected_at: new Date().toISOString(),
      reproducible: true,
    };
  }

  /**
   * Detector 3: Interruption Playback Failure (delayed cancellation exceeding threshold)
   */
  async detectInterruptionPlaybackFailure(
    context: DetectorContext,
    cancellationLatencyMs: number,
    thresholdMs: number = 150
  ): Promise<Failure | null> {
    if (cancellationLatencyMs <= thresholdMs) {
      return null;
    }

    const failureId = `fail_${crypto.randomBytes(12).toString("hex")}`;
    const summary = `Playback cancellation took ${cancellationLatencyMs}ms after interruption, exceeding ${thresholdMs}ms threshold.`;

    const rootCause = {
      description: "Audio player failed to immediately flush queued audio buffer upon interruption signal.",
      cancellationLatencyMs,
      thresholdMs,
    };

    const expected = {
      cancellationLatencyMs: `<= ${thresholdMs}ms`,
    };

    const actual = {
      cancellationLatencyMs: `${cancellationLatencyMs}ms`,
      heardLeakage: "User heard obsolete audio snippet for extra duration",
    };

    await query(
      `INSERT INTO failures (
        id, session_id, turn_id, category, severity, summary,
        root_cause_json, expected_json, actual_json, detected_at, reproducible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), TRUE)`,
      [
        failureId,
        context.sessionId,
        context.turnId || null,
        "INTERRUPTION_PLAYBACK_FAILURE",
        "HIGH",
        summary,
        JSON.stringify(rootCause),
        JSON.stringify(expected),
        JSON.stringify(actual),
      ]
    );

    return {
      id: failureId,
      session_id: context.sessionId,
      turn_id: context.turnId || null,
      category: "INTERRUPTION_PLAYBACK_FAILURE",
      severity: "HIGH",
      summary,
      root_cause_json: rootCause,
      expected_json: expected,
      actual_json: actual,
      detected_at: new Date().toISOString(),
      reproducible: true,
    };
  }

  /**
   * Detector 4: State Divergence
   */
  async detectStateDivergence(
    context: DetectorContext,
    divergenceDetails: {
      expectedStateVersion: number;
      actualStateVersion: number;
      component: string;
    }
  ): Promise<Failure | null> {
    if (divergenceDetails.expectedStateVersion === divergenceDetails.actualStateVersion) {
      return null;
    }

    const failureId = `fail_${crypto.randomBytes(12).toString("hex")}`;
    const summary = `State divergence detected in ${divergenceDetails.component}: expected v${divergenceDetails.expectedStateVersion}, found v${divergenceDetails.actualStateVersion}.`;

    const rootCause = {
      component: divergenceDetails.component,
      expectedStateVersion: divergenceDetails.expectedStateVersion,
      actualStateVersion: divergenceDetails.actualStateVersion,
    };

    await query(
      `INSERT INTO failures (
        id, session_id, turn_id, category, severity, summary,
        root_cause_json, expected_json, actual_json, detected_at, reproducible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), TRUE)`,
      [
        failureId,
        context.sessionId,
        context.turnId || null,
        "STATE_DIVERGENCE",
        "CRITICAL",
        summary,
        JSON.stringify(rootCause),
        JSON.stringify({ stateVersion: divergenceDetails.expectedStateVersion }),
        JSON.stringify({ stateVersion: divergenceDetails.actualStateVersion }),
      ]
    );

    return {
      id: failureId,
      session_id: context.sessionId,
      turn_id: context.turnId || null,
      category: "STATE_DIVERGENCE",
      severity: "CRITICAL",
      summary,
      root_cause_json: rootCause,
      expected_json: { stateVersion: divergenceDetails.expectedStateVersion },
      actual_json: { stateVersion: divergenceDetails.actualStateVersion },
      detected_at: new Date().toISOString(),
      reproducible: true,
    };
  }
}

export const failureDetectors = new FailureDetectorEngine();

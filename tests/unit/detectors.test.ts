import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { failureDetectors } from "../../lib/engine/detectors";
import { query, closeDb } from "../../lib/db";
import { runMigrations } from "../../lib/db/migrate";

describe("Failure Detectors", () => {
  const sessionId = "ses_detector_test";
  const context = {
    sessionId,
    currentStateVersion: 3,
  };

  beforeAll(async () => {
    await runMigrations();
    // Insert prerequisite project, agent, agent_version, session
    await query(
      `INSERT INTO projects (id, name) VALUES ('proj_test', 'Test Project') ON CONFLICT (id) DO NOTHING`
    );
    await query(
      `INSERT INTO agents (id, project_id, name) VALUES ('agent_test', 'proj_test', 'Test Agent') ON CONFLICT (id) DO NOTHING`
    );
    await query(
      `INSERT INTO agent_versions (id, agent_id, version, prompt) VALUES ('v1_test', 'agent_test', '1.0', 'Prompt') ON CONFLICT (id) DO NOTHING`
    );
    await query(
      `INSERT INTO sessions (id, project_id, agent_id, agent_version_id, status)
       VALUES ($1, 'proj_test', 'agent_test', 'v1_test', 'ACTIVE')
       ON CONFLICT (id) DO NOTHING`,
      [sessionId]
    );
  });

  afterAll(async () => {
    await query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
    await closeDb();
  });

  it("detects stale tool result when tool stateVersion is less than active stateVersion", async () => {
    const failure = await failureDetectors.detectStaleToolResult(context, {
      id: "tool_123",
      toolName: "database_lookup",
      stateVersion: 2,
      durationMs: 500,
    });

    expect(failure).not.toBeNull();
    expect(failure?.category).toBe("STALE_TOOL_RESULT");
    expect(failure?.severity).toBe("HIGH");
    expect(failure?.root_cause_json.toolStateVersion).toBe(2);
    expect(failure?.root_cause_json.activeStateVersion).toBe(3);
  });

  it("does not trigger failure when tool matches current state version", async () => {
    const failure = await failureDetectors.detectStaleToolResult(context, {
      id: "tool_valid",
      toolName: "database_lookup",
      stateVersion: 3,
      durationMs: 200,
    });

    expect(failure).toBeNull();
  });

  it("detects stale audio playback when artifact version is older than active state", async () => {
    const failure = await failureDetectors.detectStaleAudioPlayback(context, {
      id: "art_obsolete",
      stateVersion: 1,
      durationMs: 1400,
    });

    expect(failure).not.toBeNull();
    expect(failure?.category).toBe("STALE_OUTPUT_REJECTED");
    expect(failure?.severity).toBe("CRITICAL");
  });

  it("detects interruption playback failure when cancellation latency exceeds threshold", async () => {
    const failure = await failureDetectors.detectInterruptionPlaybackFailure(
      context,
      480, // 480ms observed cancellation
      150 // 150ms limit
    );

    expect(failure).not.toBeNull();
    expect(failure?.category).toBe("INTERRUPTION_PLAYBACK_FAILURE");
    expect(failure?.root_cause_json.cancellationLatencyMs).toBe(480);
  });

  it("passes when cancellation latency is under threshold", async () => {
    const failure = await failureDetectors.detectInterruptionPlaybackFailure(
      context,
      35,
      150
    );

    expect(failure).toBeNull();
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eventEmitter } from "../../lib/events/emitter";
import { query, closeDb } from "../../lib/db";
import { runMigrations } from "../../lib/db/migrate";

describe("Event Ordering & Monotonicity", () => {
  const sessionId = "test_ses_ordering";

  beforeAll(async () => {
    await runMigrations();
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

  it("increments event sequences monotonically per session", async () => {
    const seq1 = eventEmitter.getNextSequence(sessionId);
    const seq2 = eventEmitter.getNextSequence(sessionId);
    const seq3 = eventEmitter.getNextSequence(sessionId);

    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
    expect(seq3).toBe(3);
  });

  it("attaches required envelope metadata to emitted events", async () => {
    const evt = await eventEmitter.emit({
      sessionId,
      type: "USER_AUDIO_STARTED",
      stateVersion: 1,
      source: "CLIENT",
      status: "SUCCESS",
      payload: { sampleRate: 16000 },
    });

    expect(evt.id).toBeDefined();
    expect(evt.id.startsWith("evt_")).toBe(true);
    expect(evt.sessionId).toBe(sessionId);
    expect(evt.sequence).toBeGreaterThan(0);
    expect(evt.timestamp).toBeDefined();
    expect(new Date(evt.timestamp).getTime()).toBeGreaterThan(0);
    expect(evt.stateVersion).toBe(1);
  });
});

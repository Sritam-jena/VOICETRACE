import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { StateVersionManager } from "../../lib/engine/state-version";
import { query, closeDb } from "../../lib/db";
import { runMigrations } from "../../lib/db/migrate";

describe("StateVersionManager & Monotonic Progression", () => {
  const session1 = "test_session_1";
  const session2 = "test_session_2";

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
      [session1]
    );
    await query(
      `INSERT INTO sessions (id, project_id, agent_id, agent_version_id, status)
       VALUES ($1, 'proj_test', 'agent_test', 'v1_test', 'ACTIVE')
       ON CONFLICT (id) DO NOTHING`,
      [session2]
    );
  });

  afterAll(async () => {
    await query(`DELETE FROM sessions WHERE id IN ($1, $2)`, [session1, session2]);
    await closeDb();
  });

  it("initializes with version 1 and advances monotonically on events", async () => {
    const manager = new StateVersionManager(session1);
    expect(manager.getVersion()).toBe(1);

    const v2 = await manager.incrementVersion("NEW_TURN", "User began speaking");
    expect(v2).toBe(2);
    expect(manager.getVersion()).toBe(2);

    const v3 = await manager.incrementVersion("USER_INTERRUPT", "User interrupted speech");
    expect(v3).toBe(3);
    expect(manager.getVersion()).toBe(3);
  });

  it("validates matching state versions and rejects stale ones", async () => {
    const manager = new StateVersionManager(session2, 3);

    const match = manager.validateStateVersion(3);
    expect(match.isValid).toBe(true);

    const stale = manager.validateStateVersion(2);
    expect(stale.isValid).toBe(false);
    expect(stale.reason).toContain("Operation is stale");

    const future = manager.validateStateVersion(4);
    expect(future.isValid).toBe(false);
    expect(future.reason).toContain("Operation references future state");
  });
});

import { query, getDb } from "./index";
import { runMigrations } from "./migrate";
import { VoiceSessionRunner } from "../engine/voice-session";

export async function seedDatabase(): Promise<void> {
  console.log("==> Seeding VoiceTrace Database...");

  // Ensure tables exist
  await runMigrations();

  // 1. Create Default Project
  const projectId = "proj_demo";
  await query(
    `INSERT INTO projects (id, name, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [projectId, "Voice AI Production"]
  );

  // 2. Create Default Agent
  const agentId = "agent_concierge";
  await query(
    `INSERT INTO agents (id, project_id, name, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [agentId, projectId, "Concierge Realtime Agent"]
  );

  // 3. Create Agent Versions: v1-baseline (unguarded) and v2-guarded (fixed)
  const v1Id = "v1-baseline";
  await query(
    `INSERT INTO agent_versions (id, agent_id, version, prompt, configuration_json, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      v1Id,
      agentId,
      "1.0.0",
      "You are a helpful concierge. Fulfill user requests without strict state invalidation guards.",
      JSON.stringify({ useGuards: false, rimeModel: "coda", rimeVoice: "amber" }),
    ]
  );

  const v2Id = "v2-guarded";
  await query(
    `INSERT INTO agent_versions (id, agent_id, version, prompt, configuration_json, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      v2Id,
      agentId,
      "2.0.0",
      "You are a helpful concierge. Strict monotonic state versioning and playback cancellation guards enabled.",
      JSON.stringify({ useGuards: true, rimeModel: "coda", rimeVoice: "amber" }),
    ]
  );

  // 4. Create Canonical Acceptance Test Case
  const testCaseId = "interruption-recovery-demo";
  await query(
    `INSERT INTO test_cases (
      id, project_id, name, description, input_sequence_json,
      expected_outcome_json, fault_configuration_json, timeout_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 10000)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [
      testCaseId,
      projectId,
      "interruption-recovery-observed-output-consistency",
      "Verify that when a user interrupts during background tool execution and audio playback, obsolete audio is cancelled within 150ms and stale tool results are rejected.",
      JSON.stringify([
        { turn: 1, text: "Book a table for 4 at Bella Italia on Friday at 8 PM." },
        { turn: 1, interruptAtMs: 300, newText: "Wait, make that 2 guests instead of 4!" },
      ]),
      JSON.stringify({
        cancellationLatencyThresholdMs: 150,
        expectedFinalStateVersion: 3,
        staleToolResultRejected: true,
        finalAudioPlayedMatchesNewState: true,
      }),
      JSON.stringify({
        toolDelayMs: 600,
        interruptionAtMs: 300,
        targetEvent: "PLAYBACK_STARTED",
      }),
    ]
  );

  // 5. Seed Baseline Run (Buggy failure scenario - demonstrates the hard problem)
  console.log("==> Generating canonical failure scenario (Baseline v1)...");
  const baselineRunner = new VoiceSessionRunner({
    projectId,
    agentId,
    agentVersionId: v1Id,
    environment: "demo-synthetic",
    isSynthetic: true,
    useGuards: false,
    metadata: {
      label: "Baseline Failure (Pre-Fix)",
      scenario: "interruption-recovery-failure",
    },
  });

  await baselineRunner.start();
  await baselineRunner.executeTurn({
    userInput: "Book a table for 4 at Bella Italia on Friday at 8 PM.",
    agentResponseText:
      "I am checking availability for Bella Italia for 4 guests on Friday at 8 PM. Please hold on a moment while I query the reservation system...",
    toolCall: {
      name: "check_restaurant_availability",
      args: { restaurant: "Bella Italia", guests: 4, date: "Friday", time: "20:00" },
      simulatedResult: { available: true, tableId: "T-44" },
      delayMs: 600,
    },
    simulateInterruptionDuringPlayback: {
      interruptAfterMs: 300,
      newUserRequirement: "Wait, make that 2 guests instead of 4!",
      newAgentResponseText:
        "Understood, changing party size to 2 guests. Reservation confirmed for 2 at Bella Italia on Friday at 8 PM.",
    },
  });
  await baselineRunner.finish();
  console.log(`    Baseline failure session created: ${baselineRunner.sessionId}`);

  // Record baseline test run
  await query(
    `INSERT INTO test_runs (
      id, test_case_id, agent_version_id, session_id, status, started_at, completed_at, result_json
    ) VALUES ($1, $2, $3, $4, 'FAILED', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '4 minutes', $5)`,
    [
      `run_${baselineRunner.sessionId}`,
      testCaseId,
      v1Id,
      baselineRunner.sessionId,
      JSON.stringify({
        cancellationLatencyMs: 480,
        thresholdMs: 150,
        failuresCount: 2,
        passed: false,
        summary: "Playback cancellation exceeded 150ms threshold and obsolete audio reached user.",
      }),
    ]
  );

  // 6. Seed Fixed Guarded Run (Demonstrates the fix & proven improvement)
  console.log("==> Generating proven fixed scenario (Guarded v2)...");
  const fixedRunner = new VoiceSessionRunner({
    projectId,
    agentId,
    agentVersionId: v2Id,
    environment: "demo-synthetic",
    isSynthetic: true,
    useGuards: true,
    metadata: {
      label: "Guarded Recovery (Post-Fix)",
      scenario: "interruption-recovery-proven",
    },
  });

  await fixedRunner.start();
  await fixedRunner.executeTurn({
    userInput: "Book a table for 4 at Bella Italia on Friday at 8 PM.",
    agentResponseText:
      "I am checking availability for Bella Italia for 4 guests on Friday at 8 PM. Please hold on a moment while I query the reservation system...",
    toolCall: {
      name: "check_restaurant_availability",
      args: { restaurant: "Bella Italia", guests: 4, date: "Friday", time: "20:00" },
      simulatedResult: { available: true, tableId: "T-44" },
      delayMs: 600,
    },
    simulateInterruptionDuringPlayback: {
      interruptAfterMs: 300,
      newUserRequirement: "Wait, make that 2 guests instead of 4!",
      newAgentResponseText:
        "Understood, changing party size to 2 guests. Reservation confirmed for 2 at Bella Italia on Friday at 8 PM.",
    },
  });
  await fixedRunner.finish();
  console.log(`    Fixed guarded session created: ${fixedRunner.sessionId}`);

  // Record fixed test run
  await query(
    `INSERT INTO test_runs (
      id, test_case_id, agent_version_id, session_id, status, started_at, completed_at, result_json
    ) VALUES ($1, $2, $3, $4, 'PASSED', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '1 minutes', $5)`,
    [
      `run_${fixedRunner.sessionId}`,
      testCaseId,
      v2Id,
      fixedRunner.sessionId,
      JSON.stringify({
        cancellationLatencyMs: 28,
        thresholdMs: 150,
        failuresCount: 0,
        passed: true,
        summary: "Playback cancelled in 28ms (<150ms). Stale tool result rejected. New audio played.",
      }),
    ]
  );

  // 7. Normal Successful Turn Session
  console.log("==> Generating normal successful voice session...");
  const normalRunner = new VoiceSessionRunner({
    projectId,
    agentId,
    agentVersionId: v2Id,
    environment: "demo-synthetic",
    isSynthetic: true,
    useGuards: true,
    metadata: {
      label: "Normal Flow",
    },
  });
  await normalRunner.start();
  await normalRunner.executeTurn({
    userInput: "What are your weekend dining hours?",
    agentResponseText:
      "On Friday and Saturday, our dining room is open from 5:00 PM until 11:00 PM, with bar service until midnight.",
  });
  await normalRunner.finish();
  console.log(`    Normal session created: ${normalRunner.sessionId}`);

  console.log("==> Database seed completed successfully!");
}

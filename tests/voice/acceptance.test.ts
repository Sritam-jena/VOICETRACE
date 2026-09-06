import { describe, it, expect, afterAll } from "vitest";
import { replayEngine } from "../../lib/engine/replay";
import { closeDb } from "../../lib/db";

describe("Acceptance Test: interruption-recovery-observed-output-consistency", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("demonstrates the failure when guards are disabled (baseline)", async () => {
    const baseline = await replayEngine.runFunctionalReplay({
      testCaseId: "interruption-recovery-demo",
      useGuards: false,
    });

    // In baseline, obsolete audio continues playing (> 150ms) and failures are detected
    expect(baseline.cancellationLatencyMs).toBeGreaterThan(150);
    expect(baseline.failures.length).toBeGreaterThan(0);
    expect(baseline.failures.some((f) => f.category === "INTERRUPTION_PLAYBACK_FAILURE")).toBe(true);
  });

  it("satisfies all acceptance assertions when monotonic state guards are active (fixed)", async () => {
    const fixed = await replayEngine.runFunctionalReplay({
      testCaseId: "interruption-recovery-demo",
      useGuards: true,
    });

    // In fixed mode:
    // 1. Playback cancelled promptly (< 150ms)
    expect(fixed.cancellationLatencyMs).toBeLessThan(150);
    // 2. Zero critical failures
    expect(fixed.failures.length).toBe(0);
    // 3. Stale tool result rejected
    expect(fixed.staleOutputRejected).toBe(true);
    // 4. New state response played
    expect(fixed.newResponsePlayed).toBe(true);
    // 5. Overall test passed
    expect(fixed.passed).toBe(true);
  });
});

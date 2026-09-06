import { describe, it, expect } from "vitest";
import { METRIC_DEFINITIONS } from "../../lib/engine/metrics";

describe("Metrics Engine Formulas & Metadata", () => {
  it("defines explicit formulas and source events for all metrics", () => {
    const requiredMetrics = [
      "TTFA",
      "TTFA_USER",
      "RESPONSE_LATENCY",
      "PLAYBACK_CANCELLATION_LATENCY",
      "STALE_OUTPUT_RATE",
      "INTERRUPTION_RECOVERY_RATE",
      "TASK_SUCCESS_RATE",
      "REGRESSION_RATE",
    ];

    for (const metricName of requiredMetrics) {
      const def = METRIC_DEFINITIONS[metricName];
      expect(def).toBeDefined();
      expect(def.formula.length).toBeGreaterThan(5);
      expect(def.sourceEvents.length).toBeGreaterThan(0);
      expect(def.unit).toBeDefined();
      expect(def.calculationVersion).toBe("1.0.0");
      expect(def.eligibilityRules.length).toBeGreaterThan(10);
    }
  });

  it("ensures cancellation latency formula correlates interruption and playback cancellation", () => {
    const def = METRIC_DEFINITIONS.PLAYBACK_CANCELLATION_LATENCY;
    expect(def.sourceEvents).toContain("INTERRUPTION_STARTED");
    expect(def.sourceEvents).toContain("PLAYBACK_CANCELLED");
    expect(def.unit).toBe("ms");
  });
});

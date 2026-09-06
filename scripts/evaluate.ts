import { query, closeDb } from "../lib/db";
import { TestCase, AgentVersion } from "../lib/db/types";
import { replayEngine } from "../lib/engine/replay";

async function main() {
  console.log("================================================================================");
  console.log("VOICETRACE REGRESSION & EXPERIMENT EVALUATOR");
  console.log("================================================================================");

  const testCasesRes = await query<TestCase>(`SELECT * FROM test_cases`);
  const versionsRes = await query<AgentVersion>(`SELECT * FROM agent_versions`);

  console.log(`Found ${testCasesRes.rows.length} test case(s) and ${versionsRes.rows.length} agent version(s).\n`);

  for (const tc of testCasesRes.rows) {
    console.log(`--> Evaluating Test Case: ${tc.name}`);
    for (const v of versionsRes.rows) {
      const isGuarded = v.id.includes("guarded");
      const res = await replayEngine.runFunctionalReplay({
        testCaseId: tc.id,
        useGuards: isGuarded,
      });

      console.log(`    Version: ${v.id.padEnd(15)} | Status: ${res.passed ? "PASSED" : "FAILED"} | Cancel Latency: ${res.cancellationLatencyMs}ms | Failures: ${res.failures.length}`);
    }
  }

  console.log("\nEvaluation complete.");
  await closeDb();
}

main().catch(async (err) => {
  console.error("Evaluation failed:", err);
  await closeDb();
  process.exit(1);
});

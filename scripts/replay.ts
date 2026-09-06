import { replayEngine } from "../lib/engine/replay";
import { closeDb } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  let sessionId: string | null = null;
  let testId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" && args[i + 1]) {
      sessionId = args[i + 1];
      i++;
    } else if (args[i] === "--test" && args[i + 1]) {
      testId = args[i + 1];
      i++;
    }
  }

  console.log("================================================================================");
  console.log("VOICETRACE REPLAY ENGINE");
  console.log("================================================================================");

  if (testId) {
    console.log(`==> Mode: Deterministic Functional Replay for test: "${testId}"\n`);
    const result = await replayEngine.runFunctionalReplay({
      testCaseId: testId,
      useGuards: true,
    });

    console.log(`Replayed Session: ${result.sessionId}`);
    console.log(`Playback Cancellation Latency: ${result.cancellationLatencyMs}ms`);
    console.log(`Failures Encountered: ${result.failures.length}`);
    console.log(`Test Pass Status: ${result.passed ? "PASSED" : "FAILED"}`);
  } else if (sessionId) {
    console.log(`==> Mode: Analysis Replay for stored session: "${sessionId}"\n`);
    const result = await replayEngine.runAnalysisReplay(sessionId);

    console.log(`Total Stored Events: ${result.totalEvents}`);
    console.log(`Failures on Record: ${result.failuresFound.length}`);
    console.log("Calculated Metrics:");
    for (const [key, val] of Object.entries(result.metrics)) {
      console.log(`  - ${key}: ${val}`);
    }

    console.log("\nEvent Execution Sequence:");
    for (const evt of result.events.slice(0, 15)) {
      console.log(`  [seq ${evt.sequence.toString().padStart(2, "0")}] ${evt.timestamp.slice(11, 23)} | ${evt.type.padEnd(25)} | state v${evt.state_version} | ${evt.source}`);
    }
    if (result.events.length > 15) {
      console.log(`  ... and ${result.events.length - 15} more events`);
    }
  } else {
    console.log("Defaulting to canonical acceptance test: interruption-recovery-demo\n");
    const result = await replayEngine.runFunctionalReplay({
      testCaseId: "interruption-recovery-demo",
      useGuards: true,
    });
    console.log(`Replayed Session: ${result.sessionId}`);
    console.log(`Test Pass Status: ${result.passed ? "PASSED" : "FAILED"}`);
  }

  console.log("================================================================================");
  await closeDb();
}

main().catch(async (err) => {
  console.error("Replay execution failed:", err);
  await closeDb();
  process.exit(1);
});

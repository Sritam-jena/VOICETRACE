import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Experiment } from "@/lib/db/types";
import { replayEngine } from "@/lib/engine/replay";

export async function GET() {
  try {
    const res = await query<Experiment>(
      `SELECT e.*, 
        va.version as version_a_name, 
        vb.version as version_b_name
       FROM experiments e
       JOIN agent_versions va ON e.version_a_id = va.id
       JOIN agent_versions vb ON e.version_b_id = vb.id
       ORDER BY e.created_at DESC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const experimentId = `exp_${Date.now()}`;
    const name = body.name || "Interruption Recovery A/B Experiment";
    const versionAId = body.versionAId || "v1-baseline";
    const versionBId = body.versionBId || "v2-guarded";
    const corpusId = body.corpusId || "interruption-recovery-demo";

    // Run Version A
    const resA = await replayEngine.runFunctionalReplay({
      testCaseId: corpusId,
      useGuards: false,
    });

    // Run Version B
    const resB = await replayEngine.runFunctionalReplay({
      testCaseId: corpusId,
      useGuards: true,
    });

    const configuration = {
      versionA: {
        id: versionAId,
        cancellationLatencyMs: resA.cancellationLatencyMs,
        failuresCount: resA.failures.length,
        passed: resA.passed,
      },
      versionB: {
        id: versionBId,
        cancellationLatencyMs: resB.cancellationLatencyMs,
        failuresCount: resB.failures.length,
        passed: resB.passed,
      },
      delta: {
        latencyImprovementMs: resA.cancellationLatencyMs - resB.cancellationLatencyMs,
        failuresResolved: resA.failures.length - resB.failures.length,
      },
    };

    await query(
      `INSERT INTO experiments (
        id, project_id, name, version_a_id, version_b_id, corpus_id, configuration_json, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        experimentId,
        "proj_demo",
        name,
        versionAId,
        versionBId,
        corpusId,
        JSON.stringify(configuration),
      ]
    );

    return NextResponse.json({
      experimentId,
      name,
      results: configuration,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

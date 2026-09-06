import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { TestRun } from "@/lib/db/types";
import { replayEngine } from "@/lib/engine/replay";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get("testCaseId");

    let sql = `SELECT tr.*, tc.name as test_case_name 
               FROM test_runs tr 
               JOIN test_cases tc ON tr.test_case_id = tc.id`;
    const params: any[] = [];

    if (testCaseId) {
      params.push(testCaseId);
      sql += ` WHERE tr.test_case_id = $1`;
    }

    sql += ` ORDER BY tr.started_at DESC LIMIT 50`;

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const testCaseId = body.testCaseId || "interruption-recovery-demo";
    const useGuards = body.useGuards !== undefined ? body.useGuards : true;

    const result = await replayEngine.runFunctionalReplay({
      testCaseId,
      useGuards,
    });

    const runId = `run_${Date.now()}`;
    const agentVersionId = useGuards ? "v2-guarded" : "v1-baseline";
    const status = result.passed ? "PASSED" : "FAILED";

    await query(
      `INSERT INTO test_runs (
        id, test_case_id, agent_version_id, session_id, status,
        started_at, completed_at, result_json
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)`,
      [
        runId,
        testCaseId,
        agentVersionId,
        result.sessionId,
        status,
        JSON.stringify(result),
      ]
    );

    return NextResponse.json({
      runId,
      status,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

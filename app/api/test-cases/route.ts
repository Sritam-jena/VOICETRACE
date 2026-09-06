import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { TestCase } from "@/lib/db/types";

export async function GET() {
  try {
    const res = await query<TestCase>(`SELECT * FROM test_cases ORDER BY name ASC`);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || `tc_${Date.now()}`;

    await query(
      `INSERT INTO test_cases (
        id, project_id, name, description, input_sequence_json,
        expected_outcome_json, fault_configuration_json, timeout_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        body.projectId || "proj_demo",
        body.name,
        body.description || "",
        JSON.stringify(body.inputSequence || []),
        JSON.stringify(body.expectedOutcome || {}),
        JSON.stringify(body.faultConfiguration || {}),
        body.timeoutMs || 10000,
      ]
    );

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

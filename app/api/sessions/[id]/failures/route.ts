import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Failure } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await query<Failure>(
      `SELECT * FROM failures WHERE session_id = $1 ORDER BY detected_at ASC`,
      [params.id]
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

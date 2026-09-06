import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Session, Turn } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionRes = await query<Session>(
      `SELECT * FROM sessions WHERE id = $1`,
      [params.id]
    );

    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const turnsRes = await query<Turn>(
      `SELECT * FROM turns WHERE session_id = $1 ORDER BY sequence ASC`,
      [params.id]
    );

    return NextResponse.json({
      ...sessionRes.rows[0],
      turns: turnsRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

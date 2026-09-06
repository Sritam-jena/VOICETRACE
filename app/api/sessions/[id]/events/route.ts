import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { StoredEvent } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");

    let sql = `SELECT * FROM events WHERE session_id = $1`;
    const queryParams: any[] = [params.id];

    if (typeFilter) {
      sql += ` AND type = $2`;
      queryParams.push(typeFilter);
    }

    sql += ` ORDER BY sequence ASC`;

    const res = await query<StoredEvent>(sql, queryParams);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

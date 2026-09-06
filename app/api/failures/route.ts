import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Failure } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");

    let sql = `SELECT * FROM failures WHERE 1=1`;
    const params: any[] = [];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (severity) {
      params.push(severity);
      sql += ` AND severity = $${params.length}`;
    }

    sql += ` ORDER BY detected_at DESC LIMIT 50`;

    const res = await query<Failure>(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

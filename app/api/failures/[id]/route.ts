import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Failure } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await query<Failure>(`SELECT * FROM failures WHERE id = $1`, [
      params.id,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Failure not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

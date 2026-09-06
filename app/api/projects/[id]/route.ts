import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Project } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await query<Project>(`SELECT * FROM projects WHERE id = $1`, [
      params.id,
    ]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

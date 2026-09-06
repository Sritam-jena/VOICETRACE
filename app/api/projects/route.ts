import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Project } from "@/lib/db/types";

export async function GET() {
  try {
    const res = await query<Project>(`SELECT * FROM projects ORDER BY created_at DESC`);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { AudioArtifact } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await query<AudioArtifact>(
      `SELECT * FROM audio_artifacts WHERE session_id = $1 ORDER BY generated_at ASC`,
      [params.id]
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

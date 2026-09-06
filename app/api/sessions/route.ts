import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Session } from "@/lib/db/types";
import { VoiceSessionRunner } from "@/lib/engine/voice-session";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const res = await query<Session>(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id) as event_count,
        (SELECT COUNT(*) FROM failures f WHERE f.session_id = s.id) as failure_count,
        (SELECT COUNT(*) FROM audio_artifacts a WHERE a.session_id = s.id) as audio_count
       FROM sessions s 
       ORDER BY s.started_at DESC 
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId || "proj_demo";
    const agentId = body.agentId || "agent_concierge";
    const agentVersionId = body.agentVersionId || "v2-guarded";
    const useGuards = body.useGuards !== undefined ? body.useGuards : true;

    const runner = new VoiceSessionRunner({
      projectId,
      agentId,
      agentVersionId,
      environment: body.environment || "interactive",
      isSynthetic: false,
      useGuards,
      metadata: body.metadata || {},
    });

    await runner.start();

    // If initial turn input was provided, execute turn
    if (body.userInput) {
      await runner.executeTurn({
        userInput: body.userInput,
        agentResponseText:
          body.agentResponseText ||
          "I am assisting you with your request. Let me confirm the details for you.",
        toolCall: body.toolCall,
        simulateInterruptionDuringPlayback: body.simulateInterruption,
      });
      await runner.finish();
    }

    return NextResponse.json({
      sessionId: runner.sessionId,
      status: "ACTIVE",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

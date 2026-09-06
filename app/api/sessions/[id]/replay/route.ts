import { NextRequest, NextResponse } from "next/server";
import { replayEngine } from "@/lib/engine/replay";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "ANALYSIS";

    if (mode === "ANALYSIS") {
      const result = await replayEngine.runAnalysisReplay(params.id);
      return NextResponse.json(result);
    } else {
      const result = await replayEngine.runFunctionalReplay({
        testCaseId: body.testCaseId || "interruption-recovery-demo",
        useGuards: body.useGuards !== undefined ? body.useGuards : true,
      });
      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { processVoiceCommand } from "@/lib/engine/conversation-agent";
import { getLlmApiKey } from "@/lib/config/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = (body.prompt || "Can you fix code and explain how you work?").trim();

    const { key, provider } = getLlmApiKey();
    const start = performance.now();
    const decision = await processVoiceCommand(prompt, 1);
    const latencyMs = Math.round(performance.now() - start);

    return NextResponse.json({
      success: true,
      prompt,
      responseText: decision.responseText,
      intent: decision.intent,
      isLlmGenerated: decision.intent === "LLM_GENERATED",
      provider: provider || "local_engine",
      latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to test AI Brain" },
      { status: 500 }
    );
  }
}

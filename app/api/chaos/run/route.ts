import { NextRequest, NextResponse } from "next/server";
import { VoiceSessionRunner } from "@/lib/engine/voice-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const toolDelayMs = body.toolDelayMs ?? 600;
    const interruptAfterMs = body.interruptAfterMs ?? 300;
    const useGuards = body.useGuards !== undefined ? body.useGuards : false; // default to unguarded to demonstrate chaos failure

    const runner = new VoiceSessionRunner({
      projectId: "proj_demo",
      agentId: "agent_concierge",
      agentVersionId: useGuards ? "v2-guarded" : "v1-baseline",
      environment: "chaos-test",
      isSynthetic: false,
      useGuards,
      metadata: {
        chaosMode: true,
        toolDelayMs,
        interruptAfterMs,
      },
    });

    await runner.start();

    // Execute in background
    runner
      .executeTurn({
        userInput: "Book a table for 4 at Bella Italia on Friday at 8 PM.",
        agentResponseText:
          "I am checking availability for Bella Italia for 4 guests on Friday at 8 PM. Please hold on a moment while I query the reservation system...",
        toolCall: {
          name: "check_restaurant_availability",
          args: { restaurant: "Bella Italia", guests: 4, date: "Friday", time: "20:00" },
          simulatedResult: { available: true, tableId: "T-44" },
          delayMs: toolDelayMs,
        },
        simulateInterruptionDuringPlayback: {
          interruptAfterMs,
          newUserRequirement: "Wait, make that 2 guests instead of 4!",
          newAgentResponseText:
            "Understood, changing party size to 2 guests. Reservation confirmed for 2 at Bella Italia on Friday at 8 PM.",
        },
      })
      .then(async () => {
        await runner.finish();
      });

    return NextResponse.json({
      sessionId: runner.sessionId,
      status: "ACTIVE",
      message: "Chaos session initiated. Observe live execution in timeline.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

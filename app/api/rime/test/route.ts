import { NextResponse } from "next/server";
import { RimeTTSProvider } from "@/lib/providers/rime";
import { setRimeApiKey } from "@/lib/config/env";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.apiKey && typeof body.apiKey === "string" && body.apiKey.trim()) {
      setRimeApiKey(body.apiKey.trim());
    }

    const rime = new RimeTTSProvider();
    if (!rime.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Rime API key is not configured. Please enter your API key in Settings or add RIME_API_KEY to your .env file.",
        },
        { status: 400 }
      );
    }

    const testText =
      body.text ||
      "VoiceTrace observed-output consistency verification. Rime speech synthesis active.";

    // Normalize common model/speaker alias mixups (e.g. coda -> albion)
    let targetSpeaker = (body.speaker || "astra").toLowerCase().trim();
    if (targetSpeaker === "coda") targetSpeaker = "albion";
    if (targetSpeaker === "mist") targetSpeaker = "celeste";

    let result;
    try {
      result = await rime.synthesize({
        text: testText,
        speaker: targetSpeaker,
        modelId: body.model || "coda",
        speedAlpha: typeof body.speedAlpha === "number" ? body.speedAlpha : 1.0,
        sessionId: `test-session-${Date.now()}`,
        stateVersion: 1,
        correlationId: `test-${Date.now()}`,
      });
    } catch (synthErr: any) {
      // Fallback to default 'astra' if requested speaker voice is not supported on this account/model
      if (targetSpeaker !== "astra" && synthErr.message?.includes("Invalid speaker")) {
        result = await rime.synthesize({
          text: testText,
          speaker: "astra",
          modelId: body.model || "coda",
          speedAlpha: typeof body.speedAlpha === "number" ? body.speedAlpha : 1.0,
          sessionId: `test-session-${Date.now()}`,
          stateVersion: 1,
          correlationId: `test-${Date.now()}`,
        });
      } else {
        throw synthErr;
      }
    }

    const base64Audio = result.audioBuffer.toString("base64");
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;

    return NextResponse.json({
      success: true,
      latencyMs: result.latencyMs,
      durationMs: result.durationMs,
      model: result.model,
      voice: result.voice,
      audioBytes: result.audioBuffer.length,
      audioDataUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown error testing Rime API",
      },
      { status: 500 }
    );
  }
}

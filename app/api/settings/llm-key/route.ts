import { NextRequest, NextResponse } from "next/server";
import { getLlmApiKey, setLlmApiKey } from "@/lib/config/env";

export async function GET() {
  const { key, provider, model } = getLlmApiKey();
  const configured = Boolean(key && key.length > 5);

  return NextResponse.json({
    configured,
    provider: provider || null,
    model: model || "qwen-plus",
    // Never expose the actual raw key to the client - security guarantee
    maskedKey: configured ? "••••••••••••••••" : "",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = body.provider as "qwen";
    const apiKey = (body.apiKey || "").trim();
    const model = (body.model || "qwen-plus").trim();

    if (!provider || provider !== "qwen") {
      return NextResponse.json(
        { success: false, error: "Invalid provider. AI brain is powered by 'qwen'." },
        { status: 400 }
      );
    }

    if (!apiKey || apiKey.length < 5) {
      return NextResponse.json(
        { success: false, error: "Qwen API key cannot be empty or invalid." },
        { status: 400 }
      );
    }

    // Optional quick connectivity check if online
    try {
      const baseUrl = process.env.QWEN_BASE_URL?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
      const testRes = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      // If endpoint is reachable and returns 401/403, flag authentication error
      if (testRes.status === 401 || testRes.status === 403) {
        return NextResponse.json(
          { success: false, error: "Invalid Qwen API key (Authentication failed). Please check your key from Alibaba Cloud DashScope console." },
          { status: 400 }
        );
      }
    } catch {
      // Network timeout or offline - allow saving key for local/isolated setups
    }

    setLlmApiKey("qwen", apiKey, model);

    return NextResponse.json({
      success: true,
      provider: "qwen",
      model,
      message: "Qwen 2.5 AI Brain successfully configured and active!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update Qwen key" },
      { status: 500 }
    );
  }
}

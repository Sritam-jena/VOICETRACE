import { NextRequest, NextResponse } from "next/server";
import { getLiveKitConfig, setLiveKitConfig } from "@/lib/config/env";

export async function GET() {
  const config = getLiveKitConfig();
  // NEVER return raw API key or API secret to the client
  return NextResponse.json({
    isConfigured: config.isConfigured,
    url: config.url || "",
    hasApiKey: config.hasApiKey,
    hasApiSecret: config.hasApiSecret,
    maskedApiKey: config.hasApiKey ? "••••••••••••••••" : "",
    maskedApiSecret: config.hasApiSecret ? "••••••••••••••••" : "",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body.url || "").trim();
    const apiKey = (body.apiKey || "").trim();
    const apiSecret = (body.apiSecret || "").trim();

    if (!url && !apiKey && !apiSecret) {
      return NextResponse.json(
        { success: false, error: "LiveKit configuration parameters cannot be empty." },
        { status: 400 }
      );
    }

    setLiveKitConfig({
      url: url || undefined,
      apiKey: apiKey && !apiKey.includes("••••") ? apiKey : undefined,
      apiSecret: apiSecret && !apiSecret.includes("••••") ? apiSecret : undefined,
    });

    const updated = getLiveKitConfig();

    return NextResponse.json({
      success: true,
      isConfigured: updated.isConfigured,
      message: "LiveKit Realtime Transport configuration successfully saved!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update LiveKit configuration" },
      { status: 500 }
    );
  }
}

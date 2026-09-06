import { NextResponse } from "next/server";
import { getRimeApiKey, setRimeApiKey } from "@/lib/config/env";

export async function GET() {
  const key = getRimeApiKey();
  const isConfigured = key.length > 0;
  const maskedKey = isConfigured ? "••••••••••••••••" : "";

  return NextResponse.json({
    isConfigured,
    maskedKey,
  });
}

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (typeof apiKey !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid API key format" },
        { status: 400 }
      );
    }

    setRimeApiKey(apiKey.trim());

    return NextResponse.json({
      success: true,
      isConfigured: apiKey.trim().length > 0,
      maskedKey: apiKey.trim().length > 0 ? "••••••••••••••••" : "",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

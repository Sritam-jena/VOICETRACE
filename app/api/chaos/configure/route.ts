import { NextRequest, NextResponse } from "next/server";
import { chaosEngine } from "@/lib/engine/chaos";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    chaosEngine.configure(body);
    return NextResponse.json({
      success: true,
      currentConfig: chaosEngine.getConfig(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(chaosEngine.getConfig());
}

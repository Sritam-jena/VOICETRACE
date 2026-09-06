import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { RimeTTSProvider } from "@/lib/providers/rime";

export async function GET() {
  let dbStatus = "healthy";
  try {
    await query("SELECT 1");
  } catch (err: any) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  const rime = new RimeTTSProvider();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        type: process.env.DATABASE_URL ? "external_postgresql" : "embedded_pglite_wasm",
      },
      rime: {
        status: rime.isConfigured() ? "configured" : "fixture_mode",
        metadata: rime.getConfigMetadata(),
      },
      livekit: {
        status: process.env.LIVEKIT_URL ? "configured" : "simulation_mode",
      },
    },
  });
}

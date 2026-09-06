import { NextResponse } from "next/server";
import { metricsEngine, METRIC_DEFINITIONS } from "@/lib/engine/metrics";
import { query } from "@/lib/db";
import { Metric } from "@/lib/db/types";

export async function GET() {
  try {
    const summary = await metricsEngine.getSystemSummaryMetrics();
    const recentMetricsRes = await query<Metric>(
      `SELECT * FROM metrics ORDER BY created_at DESC LIMIT 30`
    );

    return NextResponse.json({
      summary,
      definitions: METRIC_DEFINITIONS,
      recentMetrics: recentMetricsRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

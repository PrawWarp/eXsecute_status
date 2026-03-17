import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { checkService, processCheckResult } from "@/lib/health-check";
import { logForDebugging } from "@/lib/debug";

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logForDebugging("error", "CRON_SECRET not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const isAuthorized =
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];

  for (const service of SERVICES) {
    try {
      const record = await checkService(service);
      const result = await processCheckResult(service, record);
      results.push({
        serviceId: service.id,
        healthy: record.healthy,
        responseTimeMs: record.responseTimeMs,
        transitioned: result.transitioned,
        newState: result.newState,
      });
    } catch (err) {
      logForDebugging("error", `Health check failed for ${service.id}:`, err);
      results.push({
        serviceId: service.id,
        healthy: null,
        responseTimeMs: null,
        transitioned: false,
        newState: undefined,
        error: "check failed",
      });
    }
  }

  return NextResponse.json({
    checked: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

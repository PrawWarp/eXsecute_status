import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { checkService, processCheckResult } from "@/lib/health-check";

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];

  for (const service of SERVICES) {
    const record = await checkService(service);
    const result = await processCheckResult(service, record);
    results.push({
      serviceId: service.id,
      healthy: record.healthy,
      responseTimeMs: record.responseTimeMs,
      transitioned: result.transitioned,
      newState: result.newState,
    });
  }

  return NextResponse.json({
    checked: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

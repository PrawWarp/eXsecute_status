import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import {
  getServiceStatus,
  calculateUptimePercentage,
  getRecentIncidents,
} from "@/lib/kv";
import { logForDebugging } from "@/lib/debug";

export async function GET(): Promise<NextResponse> {
  try {
    const services = await Promise.all(
      SERVICES.map(async (service) => {
        const [status, uptimePercentage] = await Promise.all([
          getServiceStatus(service.id),
          calculateUptimePercentage(service.id, 90),
        ]);

        return {
          id: service.id,
          name: service.name,
          url: service.url,
          status,
          uptimePercentage,
        };
      }),
    );

    const incidents = await getRecentIncidents(20);

    return NextResponse.json({
      services,
      incidents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logForDebugging("error", "Status API error:", err);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }
}

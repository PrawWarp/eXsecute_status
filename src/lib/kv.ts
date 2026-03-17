import { kv } from "@vercel/kv";
import type { HealthCheckRecord, ServiceStatus, Incident } from "@/types";


const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const MAX_INCIDENTS = 1000;

/**
 * Store a health check result in a sorted set keyed by service ID.
 * Score is the timestamp in epoch ms for range queries.
 * TTL is reset on each write so the key expires 90 days after the last check.
 */
export async function storeCheckResult(record: HealthCheckRecord): Promise<void> {
  const key = `checks:${record.serviceId}`;
  const score = new Date(record.timestamp).getTime();

  await kv.zadd(key, {
    score,
    member: JSON.stringify(record),
  });
  await kv.expire(key, TTL_SECONDS);
}

/**
 * Get the current persisted status for a service.
 */
export async function getServiceStatus(serviceId: string): Promise<ServiceStatus | null> {
  return kv.get<ServiceStatus>(`status:${serviceId}`);
}

/**
 * Set the current status for a service.
 */
export async function setServiceStatus(status: ServiceStatus): Promise<void> {
  await kv.set(`status:${status.serviceId}`, status);
}

/**
 * Add a new incident to the front of the incidents list.
 */
export async function addIncident(incident: Incident): Promise<void> {
  await kv.lpush("incidents", JSON.stringify(incident));
  await kv.ltrim("incidents", 0, MAX_INCIDENTS - 1);
}

/**
 * Resolve the most recent unresolved incident for a given service.
 * Scans the incident list to find the first unresolved incident matching
 * the service ID, then updates it in place with resolvedAt and downtimeMs.
 */
export async function resolveIncident(
  serviceId: string,
  resolvedAt: string,
): Promise<Incident | null> {
  const SCAN_LIMIT = 200;
  const items = await kv.lrange<string>("incidents", 0, SCAN_LIMIT - 1);
  if (!items || items.length === 0) return null;

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const incident: Incident = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (incident.serviceId === serviceId && incident.resolvedAt === null) {
      const resolvedAtTime = new Date(resolvedAt).getTime();
      const createdAtTime = new Date(incident.createdAt).getTime();
      const resolved: Incident = {
        ...incident,
        resolvedAt,
        downtimeMs: resolvedAtTime - createdAtTime,
      };
      await kv.lset("incidents", i, JSON.stringify(resolved));
      return resolved;
    }
  }

  return null;
}

/**
 * Get the most recent incidents.
 */
export async function getRecentIncidents(count: number): Promise<Incident[]> {
  const items = await kv.lrange<string>("incidents", 0, count - 1);
  if (!items) return [];

  return items.map((raw) => {
    const parsed: Incident = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed;
  });
}

/**
 * Get raw check records for a service over the given number of days.
 * Used by UptimeBar to build day-by-day segments.
 */
export async function getChecksForPeriod(
  serviceId: string,
  days: number,
): Promise<HealthCheckRecord[]> {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const key = `checks:${serviceId}`;

  const items = await kv.zrange<string[]>(key, cutoff, now, { byScore: true });
  if (!items || items.length === 0) return [];

  return items.map((raw) => {
    const record: HealthCheckRecord = typeof raw === "string" ? JSON.parse(raw) : raw;
    return record;
  });
}

/**
 * Calculate the uptime percentage for a service over the given number of days.
 * Returns a number 0-100. If no checks exist, returns 100 (assume up).
 */
export async function calculateUptimePercentage(
  serviceId: string,
  days: number,
): Promise<number> {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const key = `checks:${serviceId}`;

  const items = await kv.zrange<string[]>(key, cutoff, now, { byScore: true });
  if (!items || items.length === 0) return 100;

  let healthy = 0;
  for (const raw of items) {
    const record: HealthCheckRecord =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    if (record.healthy) healthy++;
  }

  return Math.round((healthy / items.length) * 1000) / 10;
}

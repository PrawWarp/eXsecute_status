import type { HealthCheckRecord, ServiceConfig, ServiceStatus } from "@/types";
import {
  storeCheckResult,
  getServiceStatus,
  setServiceStatus,
  addIncident,
  resolveIncident,
  getRecentIncidents,
} from "./kv";
import {
  shouldSendAlert,
  recordAlertSent,
  sendDownAlert,
  sendRecoveryAlert,
} from "./email";

const HEALTH_CHECK_TIMEOUT_MS = 10_000;

/**
 * Perform a health check against a single service.
 * Uses credentials: 'omit' since these are external URLs.
 */
export async function checkService(
  service: ServiceConfig,
): Promise<HealthCheckRecord> {
  const timestamp = new Date().toISOString();

  try {
    const start = performance.now();
    const response = await fetch(service.url, {
      credentials: "omit",
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    const responseTimeMs = Math.round(performance.now() - start);

    return {
      serviceId: service.id,
      timestamp,
      healthy: response.ok,
      responseTimeMs,
      statusCode: response.status,
    };
  } catch {
    return {
      serviceId: service.id,
      timestamp,
      healthy: false,
      responseTimeMs: null,
      statusCode: null,
    };
  }
}

/**
 * Process a check result: update consecutive counts, detect state transitions,
 * create/resolve incidents.
 */
export async function processCheckResult(
  service: ServiceConfig,
  record: HealthCheckRecord,
): Promise<{ transitioned: boolean; newState?: "up" | "down" }> {
  await storeCheckResult(record);

  const currentStatus = await getServiceStatus(service.id);

  if (!currentStatus) {
    // First check ever — initialize status
    await setServiceStatus({
      serviceId: service.id,
      state: record.healthy ? "up" : "down",
      consecutiveCount: 0,
      lastCheckedAt: record.timestamp,
      lastResponseTimeMs: record.responseTimeMs,
    });
    return { transitioned: false };
  }

  const result = computeNextState(currentStatus, record, service);

  await setServiceStatus({
    serviceId: service.id,
    state: result.state,
    consecutiveCount: result.consecutiveCount,
    lastCheckedAt: record.timestamp,
    lastResponseTimeMs: record.responseTimeMs,
  });

  if (result.transition === "down") {
    await addIncident({
      id: `inc-${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      createdAt: record.timestamp,
      resolvedAt: null,
      downtimeMs: null,
    });

    if (await shouldSendAlert(service.id)) {
      await sendDownAlert(service.name, record.timestamp);
      await recordAlertSent(service.id);
    }

    return { transitioned: true, newState: "down" };
  }

  if (result.transition === "up") {
    await resolveIncident(service.id, record.timestamp);

    // Calculate downtime from incident for recovery email
    const incidents = await getRecentIncidents(20);
    const resolved = incidents.find(
      (inc) => inc.serviceId === service.id && inc.resolvedAt !== null,
    );

    if (await shouldSendAlert(service.id)) {
      await sendRecoveryAlert(
        service.name,
        record.timestamp,
        record.responseTimeMs,
        resolved?.downtimeMs ?? 0,
      );
      await recordAlertSent(service.id);
    }

    return { transitioned: true, newState: "up" };
  }

  return { transitioned: false };
}

interface StateResult {
  state: "up" | "down";
  consecutiveCount: number;
  transition: "up" | "down" | null;
}

function computeNextState(
  current: ServiceStatus,
  record: HealthCheckRecord,
  service: ServiceConfig,
): StateResult {
  if (current.state === "up") {
    if (record.healthy) {
      // Still healthy — reset any failure count
      return { state: "up", consecutiveCount: 0, transition: null };
    }
    // Failed check while up — increment failure count
    const newCount = current.consecutiveCount + 1;
    if (newCount >= service.failureThreshold) {
      return { state: "down", consecutiveCount: 0, transition: "down" };
    }
    return { state: "up", consecutiveCount: newCount, transition: null };
  }

  // Current state is "down"
  if (!record.healthy) {
    // Still failing — reset any recovery count
    return { state: "down", consecutiveCount: 0, transition: null };
  }
  // Successful check while down — increment recovery count
  const newCount = current.consecutiveCount + 1;
  if (newCount >= service.recoveryThreshold) {
    return { state: "up", consecutiveCount: 0, transition: "up" };
  }
  return { state: "down", consecutiveCount: newCount, transition: null };
}

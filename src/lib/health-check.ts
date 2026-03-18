import type { HealthCheckRecord, ServiceConfig, ServiceStatus } from "@/types";
import {
  storeCheckResult,
  getServiceStatus,
  setServiceStatus,
  addIncident,
  resolveIncident,
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
    const initialState = record.healthy ? "up" : "down";
    await setServiceStatus({
      serviceId: service.id,
      state: initialState,
      consecutiveCount: 0,
      lastCheckedAt: record.timestamp,
      lastResponseTimeMs: record.responseTimeMs,
    });

    if (!record.healthy) {
      await addIncident({
        id: `inc-${Date.now()}`,
        serviceId: service.id,
        serviceName: service.name,
        createdAt: record.timestamp,
        resolvedAt: null,
        downtimeMs: null,
      });

      if (await shouldSendAlert(service.id, "down")) {
        await sendDownAlert(service.name, record.timestamp);
        await recordAlertSent(service.id, "down");
      }

      return { transitioned: true, newState: "down" };
    }

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

    if (await shouldSendAlert(service.id, "down")) {
      await sendDownAlert(service.name, record.timestamp);
      await recordAlertSent(service.id, "down");
    }

    return { transitioned: true, newState: "down" };
  }

  if (result.transition === "up") {
    const resolved = await resolveIncident(service.id, record.timestamp);

    if (await shouldSendAlert(service.id, "up")) {
      await sendRecoveryAlert(
        service.name,
        record.timestamp,
        record.responseTimeMs,
        resolved?.downtimeMs ?? null,
      );
      await recordAlertSent(service.id, "up");
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

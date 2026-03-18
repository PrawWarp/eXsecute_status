import { describe, it, expect } from "vitest";
import type {
  HealthCheckRecord,
  ServiceStatus,
  Incident,
  ServiceConfig,
  ServiceState,
} from "@/types";

describe("Type definitions", () => {
  it("HealthCheckRecord accepts a healthy check", () => {
    const record: HealthCheckRecord = {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: true,
      responseTimeMs: 150,
      statusCode: 200,
    };
    expect(record.healthy).toBe(true);
    expect(record.responseTimeMs).toBe(150);
  });

  it("HealthCheckRecord accepts a failed check with null response time", () => {
    const record: HealthCheckRecord = {
      serviceId: "api",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: false,
      responseTimeMs: null,
      statusCode: null,
    };
    expect(record.healthy).toBe(false);
    expect(record.responseTimeMs).toBeNull();
    expect(record.statusCode).toBeNull();
  });

  it("ServiceStatus tracks consecutive counts", () => {
    const status: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 0,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: 200,
    };
    expect(status.state).toBe("up");
    expect(status.consecutiveCount).toBe(0);
  });

  it("ServiceState only allows 'up' or 'down'", () => {
    const upState: ServiceState = "up";
    const downState: ServiceState = "down";
    expect(upState).toBe("up");
    expect(downState).toBe("down");
  });

  it("Incident tracks outage with optional resolution", () => {
    const unresolvedIncident: Incident = {
      id: "inc-001",
      serviceId: "website",
      serviceName: "Website",
      createdAt: "2026-03-16T12:00:00Z",
      resolvedAt: null,
      downtimeMs: null,
    };
    expect(unresolvedIncident.resolvedAt).toBeNull();

    const resolvedIncident: Incident = {
      id: "inc-002",
      serviceId: "api",
      serviceName: "API",
      createdAt: "2026-03-16T12:00:00Z",
      resolvedAt: "2026-03-16T12:30:00Z",
      downtimeMs: 1800000,
    };
    expect(resolvedIncident.resolvedAt).toBe("2026-03-16T12:30:00Z");
    expect(resolvedIncident.downtimeMs).toBe(1800000);
  });

  it("ServiceConfig defines a monitorable service", () => {
    const config: ServiceConfig = {
      id: "website",
      name: "Website",
      url: "https://exsecute.com/health",
      failureThreshold: 3,
      recoveryThreshold: 2,
    };
    expect(config.id).toBe("website");
    expect(config.failureThreshold).toBe(3);
    expect(config.recoveryThreshold).toBe(2);
  });
});

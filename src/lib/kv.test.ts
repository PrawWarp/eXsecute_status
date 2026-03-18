import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HealthCheckRecord, ServiceStatus, Incident } from "@/types";

const mockKv = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  zadd: vi.fn(),
  expire: vi.fn(),
  zrange: vi.fn(),
  zcard: vi.fn(),
  lpush: vi.fn(),
  lrange: vi.fn(),
  llen: vi.fn(),
  lset: vi.fn(),
  ltrim: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: () => mockKv },
}));

import {
  storeCheckResult,
  getServiceStatus,
  setServiceStatus,
  addIncident,
  resolveIncident,
  getRecentIncidents,
  getChecksForPeriod,
  calculateUptimePercentage,
} from "./kv";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("storeCheckResult", () => {
  it("stores a check record in a sorted set with 90-day TTL", async () => {
    const record: HealthCheckRecord = {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: true,
      responseTimeMs: 150,
      statusCode: 200,
    };

    await storeCheckResult(record);

    expect(mockKv.zadd).toHaveBeenCalledWith(
      "checks:website",
      {
        score: new Date("2026-03-16T12:00:00Z").getTime(),
        member: JSON.stringify(record),
      },
    );
    expect(mockKv.expire).toHaveBeenCalledWith("checks:website", 90 * 24 * 60 * 60);
  });
});

describe("getServiceStatus / setServiceStatus", () => {
  it("returns null when no status exists", async () => {
    mockKv.get.mockResolvedValue(null);
    const status = await getServiceStatus("website");
    expect(status).toBeNull();
    expect(mockKv.get).toHaveBeenCalledWith("status:website");
  });

  it("stores and retrieves service status", async () => {
    const status: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 0,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: 150,
    };

    await setServiceStatus(status);

    expect(mockKv.set).toHaveBeenCalledWith("status:website", status);
  });

  it("retrieves existing service status", async () => {
    const stored: ServiceStatus = {
      serviceId: "api",
      state: "down",
      consecutiveCount: 3,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: null,
    };
    mockKv.get.mockResolvedValue(stored);

    const result = await getServiceStatus("api");
    expect(result).toEqual(stored);
  });
});

describe("addIncident", () => {
  it("prepends an incident to the incident list and trims to max size", async () => {
    const incident: Incident = {
      id: "inc-001",
      serviceId: "website",
      serviceName: "Website",
      createdAt: "2026-03-16T12:00:00Z",
      resolvedAt: null,
      downtimeMs: null,
    };

    await addIncident(incident);

    expect(mockKv.lpush).toHaveBeenCalledWith(
      "incidents",
      JSON.stringify(incident),
    );
    expect(mockKv.ltrim).toHaveBeenCalledWith("incidents", 0, 999);
  });
});

describe("resolveIncident", () => {
  it("resolves the most recent unresolved incident and returns it", async () => {
    const unresolved: Incident = {
      id: "inc-001",
      serviceId: "website",
      serviceName: "Website",
      createdAt: "2026-03-16T12:00:00Z",
      resolvedAt: null,
      downtimeMs: null,
    };

    mockKv.lrange.mockResolvedValue([
      JSON.stringify(unresolved),
      JSON.stringify({
        id: "inc-000",
        serviceId: "api",
        serviceName: "API",
        createdAt: "2026-03-15T00:00:00Z",
        resolvedAt: "2026-03-15T01:00:00Z",
        downtimeMs: 3600000,
      }),
    ]);

    const result = await resolveIncident("website", "2026-03-16T12:30:00Z");

    expect(mockKv.lset).toHaveBeenCalledWith(
      "incidents",
      0,
      expect.stringContaining('"resolvedAt":"2026-03-16T12:30:00Z"'),
    );
    expect(result).not.toBeNull();
    expect(result!.downtimeMs).toBe(1800000);
  });

  it("returns null if no unresolved incident exists for the service", async () => {
    mockKv.lrange.mockResolvedValue([
      JSON.stringify({
        id: "inc-001",
        serviceId: "website",
        serviceName: "Website",
        createdAt: "2026-03-16T12:00:00Z",
        resolvedAt: "2026-03-16T12:30:00Z",
        downtimeMs: 1800000,
      }),
    ]);

    const result = await resolveIncident("website", "2026-03-16T13:00:00Z");

    expect(mockKv.lset).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe("getRecentIncidents", () => {
  it("returns parsed incidents from the list", async () => {
    const incident: Incident = {
      id: "inc-001",
      serviceId: "website",
      serviceName: "Website",
      createdAt: "2026-03-16T12:00:00Z",
      resolvedAt: null,
      downtimeMs: null,
    };

    mockKv.lrange.mockResolvedValue([JSON.stringify(incident)]);

    const result = await getRecentIncidents(10);
    expect(result).toEqual([incident]);
    expect(mockKv.lrange).toHaveBeenCalledWith("incidents", 0, 9);
  });

  it("returns empty array when no incidents exist", async () => {
    mockKv.lrange.mockResolvedValue(null);

    const result = await getRecentIncidents(10);
    expect(result).toEqual([]);
  });
});

describe("calculateUptimePercentage", () => {
  it("returns 100 when all checks are healthy", async () => {
    const checks: HealthCheckRecord[] = Array.from({ length: 10 }, (_, i) => ({
      serviceId: "website",
      timestamp: new Date(2026, 2, 16, i).toISOString(),
      healthy: true,
      responseTimeMs: 100,
      statusCode: 200,
    }));

    mockKv.zrange.mockResolvedValue(
      checks.map((c) => JSON.stringify(c)),
    );

    const uptime = await calculateUptimePercentage("website", 90);
    expect(uptime).toBe(100);
  });

  it("returns 0 when all checks are unhealthy", async () => {
    const checks: HealthCheckRecord[] = Array.from({ length: 5 }, (_, i) => ({
      serviceId: "website",
      timestamp: new Date(2026, 2, 16, i).toISOString(),
      healthy: false,
      responseTimeMs: null,
      statusCode: null,
    }));

    mockKv.zrange.mockResolvedValue(
      checks.map((c) => JSON.stringify(c)),
    );

    const uptime = await calculateUptimePercentage("website", 90);
    expect(uptime).toBe(0);
  });

  it("calculates correct percentage for mixed results", async () => {
    const checks: HealthCheckRecord[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        serviceId: "website",
        timestamp: new Date(2026, 2, 16, i).toISOString(),
        healthy: true,
        responseTimeMs: 100,
        statusCode: 200,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        serviceId: "website",
        timestamp: new Date(2026, 2, 16, 7 + i).toISOString(),
        healthy: false,
        responseTimeMs: null,
        statusCode: null,
      })),
    ];

    mockKv.zrange.mockResolvedValue(
      checks.map((c) => JSON.stringify(c)),
    );

    const uptime = await calculateUptimePercentage("website", 90);
    expect(uptime).toBe(70);
  });

  it("returns one decimal place precision for non-integer percentages", async () => {
    // 2 healthy out of 3 = 66.667% -> 66.7
    const checks: HealthCheckRecord[] = [
      ...Array.from({ length: 2 }, (_, i) => ({
        serviceId: "website",
        timestamp: new Date(2026, 2, 16, i).toISOString(),
        healthy: true,
        responseTimeMs: 100,
        statusCode: 200,
      })),
      {
        serviceId: "website",
        timestamp: new Date(2026, 2, 16, 2).toISOString(),
        healthy: false,
        responseTimeMs: null,
        statusCode: null,
      },
    ];

    mockKv.zrange.mockResolvedValue(
      checks.map((c) => JSON.stringify(c)),
    );

    const uptime = await calculateUptimePercentage("website", 90);
    expect(uptime).toBe(66.7);
  });

  it("returns 100 when no checks exist (no data = assume up)", async () => {
    mockKv.zrange.mockResolvedValue([]);

    const uptime = await calculateUptimePercentage("website", 90);
    expect(uptime).toBe(100);
  });
});

describe("getChecksForPeriod", () => {
  it("returns parsed health check records for the given period", async () => {
    const checks: HealthCheckRecord[] = [
      {
        serviceId: "website",
        timestamp: "2026-03-16T12:00:00Z",
        healthy: true,
        responseTimeMs: 100,
        statusCode: 200,
      },
      {
        serviceId: "website",
        timestamp: "2026-03-16T12:05:00Z",
        healthy: false,
        responseTimeMs: null,
        statusCode: 500,
      },
    ];

    mockKv.zrange.mockResolvedValue(checks.map((c) => JSON.stringify(c)));

    const result = await getChecksForPeriod("website", 90);
    expect(result).toEqual(checks);
  });

  it("returns empty array when no checks exist", async () => {
    mockKv.zrange.mockResolvedValue([]);

    const result = await getChecksForPeriod("website", 90);
    expect(result).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ServiceConfig, ServiceStatus } from "@/types";

// Mock KV module
const mockKv = vi.hoisted(() => ({
  storeCheckResult: vi.fn(),
  getServiceStatus: vi.fn(),
  setServiceStatus: vi.fn(),
  addIncident: vi.fn(),
  resolveIncident: vi.fn(),
}));

vi.mock("../kv", () => mockKv);

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { checkService, processCheckResult } from "../health-check";

const WEBSITE: ServiceConfig = {
  id: "website",
  name: "Website",
  url: "https://exsecute.com/health",
  failureThreshold: 3,
  recoveryThreshold: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));
});

describe("checkService", () => {
  it("returns a healthy record when service responds with 200", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });

    const record = await checkService(WEBSITE);

    expect(record.serviceId).toBe("website");
    expect(record.healthy).toBe(true);
    expect(record.statusCode).toBe(200);
    expect(record.responseTimeMs).toBeTypeOf("number");
    expect(record.timestamp).toBe("2026-03-16T12:00:00.000Z");
  });

  it("returns an unhealthy record when service responds with 500", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const record = await checkService(WEBSITE);

    expect(record.healthy).toBe(false);
    expect(record.statusCode).toBe(500);
    expect(record.responseTimeMs).toBeTypeOf("number");
  });

  it("returns an unhealthy record when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const record = await checkService(WEBSITE);

    expect(record.healthy).toBe(false);
    expect(record.statusCode).toBeNull();
    expect(record.responseTimeMs).toBeNull();
  });

  it("uses credentials: 'omit' for external health check fetches", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await checkService(WEBSITE);

    expect(mockFetch).toHaveBeenCalledWith(
      WEBSITE.url,
      expect.objectContaining({ credentials: "omit" }),
    );
  });

  it("passes an AbortSignal for timeout", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await checkService(WEBSITE);

    expect(mockFetch).toHaveBeenCalledWith(
      WEBSITE.url,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

describe("processCheckResult", () => {
  it("initializes service status as 'up' on first check if healthy", async () => {
    mockKv.getServiceStatus.mockResolvedValue(null);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: true,
      responseTimeMs: 150,
      statusCode: 200,
    });

    expect(mockKv.storeCheckResult).toHaveBeenCalled();
    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "website",
        state: "up",
        consecutiveCount: 0,
      }),
    );
  });

  it("increments consecutive failure count when service is up and check fails", async () => {
    const currentStatus: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 1,
      lastCheckedAt: "2026-03-16T11:55:00Z",
      lastResponseTimeMs: null,
    };
    mockKv.getServiceStatus.mockResolvedValue(currentStatus);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: false,
      responseTimeMs: null,
      statusCode: null,
    });

    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "up",
        consecutiveCount: 2,
      }),
    );
    expect(mockKv.addIncident).not.toHaveBeenCalled();
  });

  it("transitions to 'down' and creates incident after reaching failure threshold", async () => {
    const currentStatus: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 2,
      lastCheckedAt: "2026-03-16T11:55:00Z",
      lastResponseTimeMs: null,
    };
    mockKv.getServiceStatus.mockResolvedValue(currentStatus);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: false,
      responseTimeMs: null,
      statusCode: null,
    });

    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "down",
        consecutiveCount: 0,
      }),
    );
    expect(mockKv.addIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "website",
        serviceName: "Website",
        createdAt: "2026-03-16T12:00:00Z",
        resolvedAt: null,
        downtimeMs: null,
      }),
    );
  });

  it("resets consecutive count when service is up and check succeeds", async () => {
    const currentStatus: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 1,
      lastCheckedAt: "2026-03-16T11:55:00Z",
      lastResponseTimeMs: 100,
    };
    mockKv.getServiceStatus.mockResolvedValue(currentStatus);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: true,
      responseTimeMs: 150,
      statusCode: 200,
    });

    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "up",
        consecutiveCount: 0,
      }),
    );
  });

  it("increments consecutive success count when service is down and check succeeds", async () => {
    const currentStatus: ServiceStatus = {
      serviceId: "website",
      state: "down",
      consecutiveCount: 0,
      lastCheckedAt: "2026-03-16T11:55:00Z",
      lastResponseTimeMs: null,
    };
    mockKv.getServiceStatus.mockResolvedValue(currentStatus);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: true,
      responseTimeMs: 150,
      statusCode: 200,
    });

    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "down",
        consecutiveCount: 1,
      }),
    );
    expect(mockKv.resolveIncident).not.toHaveBeenCalled();
  });

  it("transitions to 'up' and resolves incident after reaching recovery threshold", async () => {
    const currentStatus: ServiceStatus = {
      serviceId: "website",
      state: "down",
      consecutiveCount: 1,
      lastCheckedAt: "2026-03-16T11:55:00Z",
      lastResponseTimeMs: 100,
    };
    mockKv.getServiceStatus.mockResolvedValue(currentStatus);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: true,
      responseTimeMs: 150,
      statusCode: 200,
    });

    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "up",
        consecutiveCount: 0,
      }),
    );
    expect(mockKv.resolveIncident).toHaveBeenCalledWith(
      "website",
      "2026-03-16T12:00:00Z",
    );
  });

  it("resets consecutive count when service is down and check fails", async () => {
    const currentStatus: ServiceStatus = {
      serviceId: "website",
      state: "down",
      consecutiveCount: 1,
      lastCheckedAt: "2026-03-16T11:55:00Z",
      lastResponseTimeMs: null,
    };
    mockKv.getServiceStatus.mockResolvedValue(currentStatus);

    await processCheckResult(WEBSITE, {
      serviceId: "website",
      timestamp: "2026-03-16T12:00:00Z",
      healthy: false,
      responseTimeMs: null,
      statusCode: null,
    });

    expect(mockKv.setServiceStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "down",
        consecutiveCount: 0,
      }),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ServiceStatus, Incident } from "@/types";

// Mock services
vi.mock("@/lib/services", () => ({
  SERVICES: [
    {
      id: "website",
      name: "Website",
      url: "https://exsecute.com/health",
      failureThreshold: 3,
      recoveryThreshold: 2,
    },
  ],
}));

// Mock KV
const mockKvFns = vi.hoisted(() => ({
  getServiceStatus: vi.fn(),
  calculateUptimePercentage: vi.fn(),
  getRecentIncidents: vi.fn(),
}));

vi.mock("@/lib/kv", () => mockKvFns);

import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/status", () => {
  it("returns current status of all services with uptime and incidents", async () => {
    const status: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 0,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: 150,
    };
    const incident: Incident = {
      id: "inc-001",
      serviceId: "website",
      serviceName: "Website",
      createdAt: "2026-03-16T10:00:00Z",
      resolvedAt: "2026-03-16T10:30:00Z",
      downtimeMs: 1800000,
    };

    mockKvFns.getServiceStatus.mockResolvedValue(status);
    mockKvFns.calculateUptimePercentage.mockResolvedValue(99.5);
    mockKvFns.getRecentIncidents.mockResolvedValue([incident]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.services).toHaveLength(1);
    expect(body.services[0].id).toBe("website");
    expect(body.services[0].name).toBe("Website");
    expect(body.services[0].status).toEqual(status);
    expect(body.services[0].uptimePercentage).toBe(99.5);
    expect(body.incidents).toHaveLength(1);
    expect(body.incidents[0].id).toBe("inc-001");
  });

  it("handles empty state (no checks yet)", async () => {
    mockKvFns.getServiceStatus.mockResolvedValue(null);
    mockKvFns.calculateUptimePercentage.mockResolvedValue(100);
    mockKvFns.getRecentIncidents.mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.services).toHaveLength(1);
    expect(body.services[0].status).toBeNull();
    expect(body.services[0].uptimePercentage).toBe(100);
    expect(body.incidents).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
    {
      id: "api",
      name: "API",
      url: "https://api.exsecute.com/health",
      failureThreshold: 3,
      recoveryThreshold: 2,
    },
  ],
}));

// Mock KV
const mockKvFns = vi.hoisted(() => ({
  getServiceStatus: vi.fn(),
  calculateUptimePercentage: vi.fn(),
  getChecksForPeriod: vi.fn(),
  getRecentIncidents: vi.fn(),
}));

vi.mock("@/lib/kv", () => mockKvFns);

import StatusPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("StatusPage", () => {
  it("renders all service cards with correct data from KV", async () => {
    const websiteStatus: ServiceStatus = {
      serviceId: "website",
      state: "up",
      consecutiveCount: 0,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: 150,
    };
    const apiStatus: ServiceStatus = {
      serviceId: "api",
      state: "up",
      consecutiveCount: 0,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: 200,
    };

    mockKvFns.getServiceStatus
      .mockResolvedValueOnce(websiteStatus)
      .mockResolvedValueOnce(apiStatus);
    mockKvFns.calculateUptimePercentage
      .mockResolvedValueOnce(99)
      .mockResolvedValueOnce(98);
    mockKvFns.getChecksForPeriod.mockResolvedValue([]);
    mockKvFns.getRecentIncidents.mockResolvedValue([]);

    const jsx = await StatusPage();
    render(jsx);

    expect(screen.getByText("eXsecute Status")).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("150ms")).toBeInTheDocument();
    expect(screen.getByText("200ms")).toBeInTheDocument();
  });

  it("renders incident timeline with recent incidents", async () => {
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
    mockKvFns.calculateUptimePercentage.mockResolvedValue(99);
    mockKvFns.getChecksForPeriod.mockResolvedValue([]);
    mockKvFns.getRecentIncidents.mockResolvedValue([incident]);

    const jsx = await StatusPage();
    render(jsx);

    expect(screen.getByText("Recent Incidents")).toBeInTheDocument();
    expect(screen.getAllByText("Website")).toHaveLength(2); // card + incident
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
  });

  it("handles empty/null KV data gracefully (first-run scenario)", async () => {
    mockKvFns.getServiceStatus.mockResolvedValue(null);
    mockKvFns.calculateUptimePercentage.mockResolvedValue(100);
    mockKvFns.getChecksForPeriod.mockResolvedValue([]);
    mockKvFns.getRecentIncidents.mockResolvedValue([]);

    const jsx = await StatusPage();
    render(jsx);

    expect(screen.getByText("eXsecute Status")).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(screen.getByText("No recent incidents")).toBeInTheDocument();
  });

  it("shows issues message when a service is down", async () => {
    const downStatus: ServiceStatus = {
      serviceId: "website",
      state: "down",
      consecutiveCount: 3,
      lastCheckedAt: "2026-03-16T12:00:00Z",
      lastResponseTimeMs: null,
    };

    mockKvFns.getServiceStatus
      .mockResolvedValueOnce(downStatus)
      .mockResolvedValueOnce(null);
    mockKvFns.calculateUptimePercentage.mockResolvedValue(95);
    mockKvFns.getChecksForPeriod.mockResolvedValue([]);
    mockKvFns.getRecentIncidents.mockResolvedValue([]);

    const jsx = await StatusPage();
    render(jsx);

    expect(
      screen.getByText("Some systems are experiencing issues"),
    ).toBeInTheDocument();
  });
});

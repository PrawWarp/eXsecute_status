import { describe, it, expect, vi, beforeEach } from "vitest";

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

// Mock health check
const mockHealthCheck = vi.hoisted(() => ({
  checkService: vi.fn().mockResolvedValue({
    serviceId: "website",
    timestamp: "2026-03-16T12:00:00Z",
    healthy: true,
    responseTimeMs: 150,
    statusCode: 200,
  }),
  processCheckResult: vi.fn().mockResolvedValue({ transitioned: false }),
}));

vi.mock("@/lib/health-check", () => mockHealthCheck);

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret-123");
});

describe("GET /api/cron", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const request = new Request("http://localhost/api/cron");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when Authorization header has wrong secret", async () => {
    const request = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 and runs health checks with correct secret", async () => {
    const request = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer test-secret-123" },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.checked).toBe(1);
    expect(mockHealthCheck.checkService).toHaveBeenCalledTimes(1);
    expect(mockHealthCheck.processCheckResult).toHaveBeenCalledTimes(1);
  });

  it("returns response with correct JSON structure", async () => {
    const request = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer test-secret-123" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body).toHaveProperty("checked");
    expect(body).toHaveProperty("results");
    expect(body).toHaveProperty("timestamp");
    expect(body.results[0]).toEqual({
      serviceId: "website",
      healthy: true,
      responseTimeMs: 150,
      transitioned: false,
      newState: undefined,
    });
  });

  it("catches individual service check failure and continues", async () => {
    mockHealthCheck.checkService.mockRejectedValueOnce(new Error("DNS failure"));

    const request = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer test-secret-123" },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.checked).toBe(1);
    expect(body.results[0]).toEqual({
      serviceId: "website",
      healthy: null,
      responseTimeMs: null,
      transitioned: false,
      newState: undefined,
      error: "check failed",
    });
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const request = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer test-secret-123" },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});

import { describe, it, expect } from "vitest";
import { SERVICES, getServiceById } from "../services";

describe("Service configuration", () => {
  it("defines exactly 3 services", () => {
    expect(SERVICES).toHaveLength(3);
  });

  it("includes website, app, and api services", () => {
    const ids = SERVICES.map((s) => s.id);
    expect(ids).toContain("website");
    expect(ids).toContain("app");
    expect(ids).toContain("api");
  });

  it("website monitors exsecute.com/health", () => {
    const website = SERVICES.find((s) => s.id === "website");
    expect(website).toBeDefined();
    expect(website!.name).toBe("Website");
    expect(website!.url).toBe("https://exsecute.com/health");
  });

  it("app monitors app.exsecute.com root URL", () => {
    const app = SERVICES.find((s) => s.id === "app");
    expect(app).toBeDefined();
    expect(app!.name).toBe("App");
    expect(app!.url).toBe("https://app.exsecute.com");
  });

  it("api monitors api.exsecute.com/health", () => {
    const api = SERVICES.find((s) => s.id === "api");
    expect(api).toBeDefined();
    expect(api!.name).toBe("API");
    expect(api!.url).toBe("https://api.exsecute.com/health");
  });

  it("all services have default failure threshold of 3", () => {
    for (const service of SERVICES) {
      expect(service.failureThreshold).toBe(3);
    }
  });

  it("all services have default recovery threshold of 2", () => {
    for (const service of SERVICES) {
      expect(service.recoveryThreshold).toBe(2);
    }
  });

  it("all services have unique IDs", () => {
    const ids = SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all services have valid HTTPS URLs", () => {
    for (const service of SERVICES) {
      expect(service.url).toMatch(/^https:\/\//);
    }
  });
});

describe("getServiceById", () => {
  it("returns the correct service for a valid ID", () => {
    const website = getServiceById("website");
    expect(website).toBeDefined();
    expect(website!.id).toBe("website");
    expect(website!.name).toBe("Website");
  });

  it("returns undefined for an unknown ID", () => {
    expect(getServiceById("nonexistent")).toBeUndefined();
  });
});

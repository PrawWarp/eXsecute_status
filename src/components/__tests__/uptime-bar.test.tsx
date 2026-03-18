import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UptimeBar } from "../uptime-bar";
import type { HealthCheckRecord } from "@/types";

describe("UptimeBar", () => {
  it("renders 90 day segments", () => {
    const { container } = render(<UptimeBar checks={[]} days={90} />);
    const segments = container.querySelectorAll("[data-testid='uptime-segment']");
    expect(segments).toHaveLength(90);
  });

  it("renders green segments for healthy days", () => {
    const checks: HealthCheckRecord[] = [
      {
        serviceId: "website",
        timestamp: new Date().toISOString(),
        healthy: true,
        responseTimeMs: 100,
        statusCode: 200,
      },
    ];

    const { container } = render(<UptimeBar checks={checks} days={90} />);
    const segments = container.querySelectorAll("[data-testid='uptime-segment']");
    // The most recent segment (last one) should be green
    const lastSegment = segments[segments.length - 1];
    expect(lastSegment.className).toContain("bg-green");
  });

  it("renders gray segments for days with no data", () => {
    const { container } = render(<UptimeBar checks={[]} days={90} />);
    const segments = container.querySelectorAll("[data-testid='uptime-segment']");
    // All segments should be gray (no data)
    for (const segment of segments) {
      expect(segment.className).toContain("bg-gray");
    }
  });
});

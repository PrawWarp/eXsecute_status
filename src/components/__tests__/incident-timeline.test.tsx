import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IncidentTimeline } from "../incident-timeline";
import type { Incident } from "@/types";

describe("IncidentTimeline", () => {
  it("renders incidents with service name and timestamps", () => {
    const incidents: Incident[] = [
      {
        id: "inc-001",
        serviceId: "website",
        serviceName: "Website",
        createdAt: "2026-03-16T10:00:00Z",
        resolvedAt: "2026-03-16T10:30:00Z",
        downtimeMs: 1800000,
      },
    ];

    render(<IncidentTimeline incidents={incidents} />);

    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
  });

  it("shows 'Ongoing' for unresolved incidents", () => {
    const incidents: Incident[] = [
      {
        id: "inc-002",
        serviceId: "api",
        serviceName: "API",
        createdAt: "2026-03-16T12:00:00Z",
        resolvedAt: null,
        downtimeMs: null,
      },
    ];

    render(<IncidentTimeline incidents={incidents} />);

    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
  });

  it("shows 'No recent incidents' when empty", () => {
    render(<IncidentTimeline incidents={[]} />);
    expect(screen.getByText("No recent incidents")).toBeInTheDocument();
  });
});

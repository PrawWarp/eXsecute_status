import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceStatusCard } from "./status-card";

describe("ServiceStatusCard", () => {
  it("renders service name and 'Operational' when up", () => {
    render(
      <ServiceStatusCard
        name="Website"
        state="up"
        responseTimeMs={150}
        lastCheckedAt="2026-03-16T12:00:00Z"
        uptimePercentage={99.9}
      />,
    );

    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("150ms")).toBeInTheDocument();
  });

  it("renders 'Down' state correctly", () => {
    render(
      <ServiceStatusCard
        name="API"
        state="down"
        responseTimeMs={null}
        lastCheckedAt="2026-03-16T12:00:00Z"
        uptimePercentage={95.0}
      />,
    );

    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("Down")).toBeInTheDocument();
  });

  it("renders 'Unknown' state when no status exists", () => {
    render(
      <ServiceStatusCard
        name="App"
        state={null}
        responseTimeMs={null}
        lastCheckedAt={null}
        uptimePercentage={100}
      />,
    );

    expect(screen.getByText("App")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("displays uptime percentage", () => {
    render(
      <ServiceStatusCard
        name="Website"
        state="up"
        responseTimeMs={100}
        lastCheckedAt="2026-03-16T12:00:00Z"
        uptimePercentage={99.5}
      />,
    );

    expect(screen.getByText("99.5%")).toBeInTheDocument();
  });
});

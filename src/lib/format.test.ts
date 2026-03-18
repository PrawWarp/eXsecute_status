import { describe, it, expect } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(5000)).toBe("5 seconds");
  });

  it("formats singular second", () => {
    expect(formatDuration(1000)).toBe("1 second");
  });

  it("formats minutes only", () => {
    expect(formatDuration(30 * 60 * 1000)).toBe("30 minutes");
  });

  it("formats singular minute", () => {
    expect(formatDuration(60 * 1000)).toBe("1 minute");
  });

  it("formats hours only", () => {
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe("2 hours");
  });

  it("formats singular hour", () => {
    expect(formatDuration(60 * 60 * 1000)).toBe("1 hour");
  });

  it("formats hours and minutes combined", () => {
    expect(formatDuration(1.5 * 60 * 60 * 1000)).toBe("1 hour 30 minutes");
  });

  it("formats zero milliseconds as 0 seconds", () => {
    expect(formatDuration(0)).toBe("0 seconds");
  });
});

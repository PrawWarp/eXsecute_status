import { describe, it, expect, vi } from "vitest";
import { logForDebugging } from "./debug";

describe("logForDebugging", () => {
  it("delegates to console with the specified level", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logForDebugging("warn", "test message");
    expect(spy).toHaveBeenCalledWith("test message");
    spy.mockRestore();
  });
});

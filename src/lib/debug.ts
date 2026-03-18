export function logForDebugging(
  level: "log" | "warn" | "error" | "debug" | "info",
  ...args: unknown[]
): void {
  console[level](...args);
}

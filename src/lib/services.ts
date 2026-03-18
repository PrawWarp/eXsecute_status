import type { ServiceConfig } from "@/types";

const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RECOVERY_THRESHOLD = 2;

export const SERVICES: readonly ServiceConfig[] = [
  {
    id: "website",
    name: "Website",
    url: "https://exsecute.com/health",
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    recoveryThreshold: DEFAULT_RECOVERY_THRESHOLD,
  },
  {
    id: "app",
    name: "App",
    url: "https://app.exsecute.com",
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    recoveryThreshold: DEFAULT_RECOVERY_THRESHOLD,
  },
  {
    id: "api",
    name: "API",
    url: "https://api.exsecute.com/health",
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    recoveryThreshold: DEFAULT_RECOVERY_THRESHOLD,
  },
] as const;

export function getServiceById(id: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.id === id);
}

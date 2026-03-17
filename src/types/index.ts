/** Configuration for a service to monitor */
export interface ServiceConfig {
  /** Unique identifier for the service */
  id: string;
  /** Human-readable display name */
  name: string;
  /** URL to check for health */
  url: string;
  /** Number of consecutive failures before declaring down */
  failureThreshold: number;
  /** Number of consecutive successes before declaring recovered */
  recoveryThreshold: number;
}

/** Result of a single health check */
export interface HealthCheckRecord {
  /** Service ID this check belongs to */
  serviceId: string;
  /** ISO 8601 timestamp of when the check was performed */
  timestamp: string;
  /** Whether the service responded successfully (HTTP 2xx within timeout) */
  healthy: boolean;
  /** Response time in milliseconds, or null if timed out / unreachable */
  responseTimeMs: number | null;
  /** HTTP status code, or null if the request failed entirely */
  statusCode: number | null;
}

/** Current operational status of a service */
export type ServiceState = "up" | "down";

/** Persisted status tracking for a service */
export interface ServiceStatus {
  /** Service ID */
  serviceId: string;
  /** Current state */
  state: ServiceState;
  /** Number of consecutive checks in the current direction (failures if up, successes if down) */
  consecutiveCount: number;
  /** ISO 8601 timestamp of the last check */
  lastCheckedAt: string;
  /** Response time of the last check in ms, or null */
  lastResponseTimeMs: number | null;
}

/** An incident record for a service outage */
export interface Incident {
  /** Unique incident ID */
  id: string;
  /** Service ID this incident belongs to */
  serviceId: string;
  /** Human-readable service name */
  serviceName: string;
  /** ISO 8601 timestamp when the outage was detected */
  createdAt: string;
  /** ISO 8601 timestamp when the service recovered, or null if ongoing */
  resolvedAt: string | null;
  /** Downtime duration in milliseconds, or null if ongoing */
  downtimeMs: number | null;
}

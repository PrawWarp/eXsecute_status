import type { ServiceState } from "@/types";

interface ServiceStatusCardProps {
  name: string;
  state: ServiceState | null;
  responseTimeMs: number | null;
  lastCheckedAt: string | null;
  uptimePercentage: number;
}

export function ServiceStatusCard({
  name,
  state,
  responseTimeMs,
  lastCheckedAt,
  uptimePercentage,
}: ServiceStatusCardProps) {
  return (
    <div className="rounded-lg border border-foreground/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot state={state} />
          <h3 className="text-lg font-semibold">{name}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm text-foreground/60">
          {responseTimeMs !== null && <span>{responseTimeMs}ms</span>}
          <span className="font-medium">{uptimePercentage}%</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <StatusLabel state={state} />
        {lastCheckedAt && (
          <span className="text-foreground/50">
            Last checked: {formatTimestamp(lastCheckedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusDot({ state }: { state: ServiceState | null }) {
  const color =
    state === "up"
      ? "bg-green"
      : state === "down"
        ? "bg-red-500"
        : "bg-gray-400";

  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

function StatusLabel({ state }: { state: ServiceState | null }) {
  if (state === "up")
    return <span className="font-medium text-green">Operational</span>;
  if (state === "down")
    return <span className="font-medium text-red-500">Down</span>;
  return <span className="font-medium text-gray-400">Unknown</span>;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

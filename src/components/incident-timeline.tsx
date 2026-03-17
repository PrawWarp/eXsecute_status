import type { Incident } from "@/types";

interface IncidentTimelineProps {
  incidents: Incident[];
}

export function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  if (incidents.length === 0) {
    return (
      <p className="py-8 text-center text-foreground/50">
        No recent incidents
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className="rounded-lg border border-foreground/10 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  incident.resolvedAt ? "bg-green" : "bg-red-500"
                }`}
              />
              <span className="font-medium">{incident.serviceName}</span>
            </div>
            <span className="text-sm text-foreground/50">
              {formatDate(incident.createdAt)}
            </span>
          </div>
          <div className="mt-2 text-sm text-foreground/60">
            {incident.resolvedAt ? (
              <span>
                Resolved — downtime: {formatDuration(incident.downtimeMs!)}
              </span>
            ) : (
              <span className="font-medium text-red-500">Ongoing</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0)
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${totalSeconds} second${totalSeconds !== 1 ? "s" : ""}`;
}

import type { HealthCheckRecord } from "@/types";

interface UptimeBarProps {
  checks: HealthCheckRecord[];
  days: number;
}

export function UptimeBar({ checks, days }: UptimeBarProps) {
  const segments = buildDaySegments(checks, days);

  return (
    <div className="flex gap-px">
      {segments.map((segment, i) => (
        <div
          key={i}
          data-testid="uptime-segment"
          className={`h-8 flex-1 rounded-sm ${getSegmentColor(segment)}`}
          title={segment.date}
        />
      ))}
    </div>
  );
}

interface DaySegment {
  date: string;
  healthy: number;
  unhealthy: number;
}

function getSegmentColor(segment: DaySegment): string {
  const total = segment.healthy + segment.unhealthy;
  if (total === 0) return "bg-gray-200";
  if (segment.unhealthy === 0) return "bg-green";
  if (segment.healthy === 0) return "bg-red-500";
  return "bg-yellow-400";
}

function buildDaySegments(
  checks: HealthCheckRecord[],
  days: number,
): DaySegment[] {
  const now = new Date();
  const segments: DaySegment[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    segments.push({ date: dateStr, healthy: 0, unhealthy: 0 });
  }

  for (const check of checks) {
    const checkDate = check.timestamp.split("T")[0];
    const segment = segments.find((s) => s.date === checkDate);
    if (segment) {
      if (check.healthy) segment.healthy++;
      else segment.unhealthy++;
    }
  }

  return segments;
}

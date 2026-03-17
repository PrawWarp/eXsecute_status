import { SERVICES } from "@/lib/services";
import {
  getServiceStatus,
  calculateUptimePercentage,
  getChecksForPeriod,
  getRecentIncidents,
} from "@/lib/kv";
import { ServiceStatusCard } from "@/components/status-card";
import { UptimeBar } from "@/components/uptime-bar";
import { IncidentTimeline } from "@/components/incident-timeline";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const services = await Promise.all(
    SERVICES.map(async (service) => {
      const [status, uptimePercentage, checks] = await Promise.all([
        getServiceStatus(service.id),
        calculateUptimePercentage(service.id, 90),
        getChecksForPeriod(service.id, 90),
      ]);

      return {
        ...service,
        status,
        uptimePercentage,
        checks,
      };
    }),
  );

  const incidents = await getRecentIncidents(20);

  const allUp = services.every(
    (s) => s.status === null || s.status.state === "up",
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-navy md:text-3xl">eXsecute Status</h1>
        <p className="mt-2 text-base text-foreground/60 md:text-lg">
          {allUp ? "All systems operational" : "Some systems are experiencing issues"}
        </p>
      </header>

      <section className="space-y-3">
        {services.map((service) => (
          <div key={service.id}>
            <ServiceStatusCard
              name={service.name}
              state={service.status?.state ?? null}
              responseTimeMs={service.status?.lastResponseTimeMs ?? null}
              lastCheckedAt={service.status?.lastCheckedAt ?? null}
              uptimePercentage={service.uptimePercentage}
            />
            <div className="mt-2">
              <UptimeBar checks={service.checks} days={90} />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 md:mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy md:text-xl">
          Recent Incidents
        </h2>
        <IncidentTimeline incidents={incidents} />
      </section>

      <footer className="mt-12 border-t border-foreground/10 pt-4 text-center text-sm text-foreground/40 md:mt-16">
        <p>Powered by eXsecute</p>
      </footer>
    </main>
  );
}

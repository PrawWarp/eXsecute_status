# eXsecute Status Page - Design Spec

**Date**: 2026-03-16
**Repo**: `eXsecute_status` (new, under PrawWarp org)
**Hosting**: Vercel (independent from Vultr VPS)
**Domain**: `status.exsecute.com`

## Vision

Build our own UptimeRobot — a self-hosted, eXsecute-branded uptime monitoring and status page system. Instead of relying on a third-party SaaS, we own the monitoring infrastructure, the data, and the user experience.

**Why build instead of buy?**
- Full brand control — `status.exsecute.com` with eXsecute design, not a generic SaaS page
- Future auto-recovery — trigger GitHub Actions redeploys when services go unhealthy (UptimeRobot can't do this)
- Data ownership — uptime history, incident logs, and response times in our own infrastructure
- No vendor limits — no monitor caps, feature gates, or pricing tiers for basic functionality
- Foundation for more — SSL monitoring, Teams alerts, maintenance windows, response time graphs on our roadmap

**What we're building in v1:**
- Scheduled health checks (every 5 min)
- State change alerting (email via AWS SES)
- Public branded status page with uptime history
- Response time tracking
- Incident timeline

**What we're deferring to future versions:**
- Auto-redeploy via GitHub Actions on sustained failure
- Multi-region checks
- SSL certificate monitoring
- Keyword/body matching
- SMS/Teams alerts
- Maintenance windows
- Response time graphs

## Problem

The marketing site (`exsecute.com`) went down for days without anyone noticing. The Flask/Gunicorn container became unhealthy but Traefik returned 503. No monitoring or alerting exists for any eXsecute service.

## Goals

1. **Monitor all eXsecute services** — Website (`exsecute.com`), App (`app.exsecute.com`), API (`api.exsecute.com`)
2. **Alert on outages** — Email notification when a service goes down or recovers
3. **Public status page** — Branded page at `status.exsecute.com` showing current status, uptime history (90 days), and recent incidents
4. **Independent infrastructure** — The monitor must stay up even if the services it monitors go down (separate hosting from Vultr VPS)

## Constraints

- **Vercel hosting** — Deploy as a Next.js app on Vercel (same platform as `app.exsecute.com`)
- **Vercel free tier** — Status page and API hosted on Vercel Hobby (free). Cron scheduling handled by GitHub Actions (free), not Vercel Cron (which requires Pro at $20/month for sub-daily intervals)
- **AWS SES for email** — Already have production SES with `exsecute.com` domain verified (us-east-1). `status@exsecute.com` works as sender without additional setup
- **eXsecute brand** — Navy (`#003d7a`), Cyan (`#00acc1`), Green (`#10b981`). Use CSS variables, not hardcoded hex. Clean, minimal design
- **No false alarms** — Don't alert on transient blips. Require 3 consecutive failures before declaring a service down, and 2 consecutive successes before declaring recovery
- **No alert storms** — Include cooldown between alerts for the same service to handle flapping
- **Secure cron endpoint** — The health check trigger must be authenticated (not publicly callable)

## Services to Monitor

| Service | Health Endpoint | Notes |
|---|---|---|
| Website | `https://exsecute.com/health` | Flask app, returns JSON `{"status": "healthy"}` |
| App | `https://app.exsecute.com` | Next.js app on Vercel. Check root URL for HTTP 200 (no dedicated health endpoint available) |
| API | `https://api.exsecute.com/health` | FastAPI on Vultr |

## Key Behaviors

### Health Checking
- Check each service every 5 minutes
- 10-second timeout per check
- Track response time for each check
- Store 90 days of check history

### Alerting
- Email via AWS SES on state transitions (up-to-down, down-to-up)
- No repeat alerts while a service stays in the same state
- 1-hour cooldown per service to prevent alert storms from flapping services
- Recipients configurable via environment variable (default: `info@exsecute.com`)

### Status Page
- Show current status of each service (up/down, response time)
- Show 90-day uptime percentage per service
- Show uptime bar visualization (like GitHub's status page — green/red segments over time)
- Show recent incidents with timestamps
- Responsive and mobile-friendly

### Incidents
- An incident is created when a service transitions from up to down (after consecutive failure threshold)
- An incident is resolved (with `resolvedAt` timestamp and downtime duration) when the service transitions from down to up
- Incident log persisted indefinitely (or until manually cleared)

### Data Retention
- 90 days of check history (auto-expire, no manual cleanup)

## Tech Stack Guidance

- **Next.js 15** (App Router) — consistent with `eXsecute_app`
- **Vercel KV** (Redis) — for storing check results, status, incidents
- **AWS SES SDK** — for alert emails
- **Tailwind CSS** — for styling with eXsecute brand
- **GitHub Actions cron** — for scheduling checks every 5 minutes (free, calls the authenticated cron endpoint via curl)

## Success Criteria

1. All 3 services monitored with 5-minute checks
2. Email alert received within 15-20 minutes of an actual outage (accounting for consecutive failure threshold)
3. Status page at `status.exsecute.com` accurately shows current state and history
4. No false alerts from transient network issues
5. Monitor stays operational even when monitored services are down

# Implementation Plan

> eXsecute Status Page — self-hosted uptime monitoring and status page
> Spec: `docs/specs/2026-03-16-status-page-design.md`

## Status Summary

- **Source code**: Next.js 15 project initialized with Tailwind CSS 4, Vitest, ESLint
- **Project scaffolding**: Complete — package.json, tsconfig, next.config.ts, CLAUDE.md, all configs
- **Phase 1**: Complete
- **Phase 2**: Complete
- **Next**: Phase 3 — Data Layer (Vercel KV)

## Known Issues

- **Semgrep fetch credentials rule** — Health checks fetch external URLs where `credentials: 'include'` is wrong. Use `credentials: 'omit'` explicitly on health check fetches to satisfy the semgrep pattern-not while being semantically correct.
- **npm cache permissions** — Root-owned files in `~/.npm`. Use `npm_config_cache=/private/tmp/claude-501/npm-cache` as workaround.

## Tasks

Tasks are ordered by dependency and priority. Each phase includes its own tests (TDD per PROMPT_build.md).

### Phase 1: Project Initialization & Test Framework

- [x] Initialize Next.js 15 project with TypeScript and App Router (package.json, tsconfig.json, next.config.ts)
- [x] Configure Tailwind CSS with eXsecute brand colors as CSS variables (Navy #003d7a, Cyan #00acc1, Green #10b981)
- [x] Set up Vitest with proper configuration and npm test script
- [x] Create .gitignore for node_modules, .next, .env*.local, .vercel
- [x] Create .env.example with all required environment variables (CRON_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, ALERT_RECIPIENTS)
- [x] Add npm scripts: test, type-check, lint, build, ci (to match ralph/AGENTS.md expectations)
- [x] Create src/lib/debug.ts logger utility (required by .semgrep.yml — no direct console.* allowed)
- [x] Update knip.config.ts to add `src/app/api/**/route.ts` to entry points
- [x] Update ralph/AGENTS.md key directories to match this project (remove dashboard, hooks, query-client, api-client references)
- [x] Create CLAUDE.md with project-specific security requirements and conventions

### Phase 2: Types & Data Models

- [x] Define TypeScript types in src/types/ — HealthCheckRecord, ServiceStatus, Incident, ServiceConfig
- [x] Define service configuration constants (3 services: website at exsecute.com/health, app at app.exsecute.com root URL for HTTP 200, api at api.exsecute.com/health)
- [x] Write unit tests for type validation and service config correctness

### Phase 3: Data Layer (Vercel KV)

- [ ] Create src/lib/kv.ts — Vercel KV client wrapper for health check storage
- [ ] Implement check result storage with 90-day auto-expiry (Redis TTL)
- [ ] Implement service status read/write (current state, consecutive counts, last check timestamp)
- [ ] Implement incident log storage and retrieval (sorted by timestamp, persisted indefinitely)
- [ ] Implement 90-day uptime percentage calculation from stored check history
- [ ] Write unit tests for KV data layer (mock KV client; test storage, retrieval, TTL expiry, uptime calculation)

### Phase 4: Health Check Engine

- [ ] Create src/lib/health-check.ts — fetch each service endpoint with 10-second timeout, record status and response time; use `credentials: 'omit'` on fetch calls (external URLs)
- [ ] Implement consecutive failure threshold logic (configurable, default 3 consecutive failures before declaring down)
- [ ] Implement consecutive success threshold logic (configurable, default 2 consecutive successes before declaring recovery)
- [ ] Implement state transition detection (up-to-down, down-to-up), incident creation on down, and incident resolution with `resolvedAt` timestamp and downtime duration on recovery
- [ ] Write unit tests for health check logic (timeout handling, status detection, consecutive threshold transitions, incident logging)

### Phase 5: Email Alerting (AWS SES)

- [ ] Create src/lib/email.ts — AWS SES integration for sending alert emails
- [ ] Implement alert email templates for down and recovery notifications (include service name, timestamp, response time, duration for recovery)
- [ ] Implement cooldown mechanism to prevent alert storms from flapping services (1-hour cooldown per service, configurable via env var)
- [ ] Wire alerting into state transition logic — send email only on state changes, respect cooldown
- [ ] Write unit tests for email alerting (cooldown enforcement, template rendering, recipient configuration from ALERT_RECIPIENTS env var)

### Phase 6: API Routes

- [ ] Create authenticated cron endpoint (src/app/api/cron/route.ts) — validates CRON_SECRET header, runs all health checks, updates state in KV, sends alerts on transitions
- [ ] Create public status API endpoint (src/app/api/status/route.ts) — returns current status of all services, uptime percentages, recent incidents
- [ ] Write integration tests for cron route (authentication validation, full check cycle with mocked services)
- [ ] Write integration tests for status route (correct data shape, handles empty state)

### Phase 7: Status Page UI

- [ ] Create root layout (src/app/layout.tsx) with eXsecute branding, metadata, Tailwind setup
- [ ] Create status page (src/app/page.tsx) — server component fetching current status from KV
- [ ] Build service status cards — up/down indicator with response time and last-checked timestamp
- [ ] Build 90-day uptime bar visualization (green/red segments like GitHub status page)
- [ ] Build 90-day uptime percentage display per service
- [ ] Build recent incidents timeline with timestamps and durations
- [ ] Ensure responsive/mobile-friendly design
- [ ] Write component tests for status page UI (rendering up/down states, uptime bar rendering, empty state handling)

### Phase 8: GitHub Actions Workflow

- [ ] Create .github/workflows/health-check.yml — cron schedule every 5 minutes, calls authenticated cron endpoint via curl with CRON_SECRET
- [ ] Document required GitHub Actions secrets: CRON_SECRET, STATUS_PAGE_URL

### Phase 9: Deployment & Configuration

- [ ] Configure Vercel project for deployment (vercel.json if needed, environment variables)
- [ ] Document deployment steps: Vercel KV provisioning, AWS SES credentials, GitHub Actions secrets, DNS CNAME for status.exsecute.com
- [ ] Verify all success criteria from spec:
  - All 3 services monitored with 5-minute checks
  - Email alert within 15-20 minutes of outage (3 consecutive failures × 5 min = 15 min)
  - Status page shows current state and 90-day history
  - No false alerts from transient issues
  - Monitor operational when monitored services are down

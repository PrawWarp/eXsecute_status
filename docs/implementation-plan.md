# Implementation Plan

> eXsecute Status Page — self-hosted uptime monitoring and status page
> Spec: `docs/specs/2026-03-16-status-page-design.md`

## Status Summary

- **All 9 original phases**: Complete
- **All 8 remaining tasks (P1-P8)**: Complete
- **88 tests passing** across 13 test files, 0 skipped
- **TypeScript**: Clean (no errors)
- **Branch**: `feat/initial-implementation`
- **Last verified**: 2026-03-17 (`make agent-verify` — all checks green)

## Codebase vs Spec Verification (2026-03-17)

Verified by reading all 14 source files, all 11 test files, running searches for TODOs/FIXMEs/skipped tests, and cross-referencing each spec requirement against the implementation.

### Confirmed Complete

- **Health check engine** (`src/lib/health-check.ts`): 10s timeout via `AbortSignal.timeout()`, `credentials: 'omit'`, response time via `performance.now()`, consecutive failure (3) / recovery (2) thresholds, state transitions create/resolve incidents, generic catch block handles DNS/network/timeout errors — all per spec
- **Email alerting** (`src/lib/email.ts`): AWS SES with region fallback to `us-east-1`, down/recovery templates with service name + timestamp + response time + duration, 1-hour cooldown with separate keys per event type (`alert-cooldown:{serviceId}:down|up`), configurable recipients via `ALERT_RECIPIENTS` env var (comma-separated, defaults to `info@exsecute.com`)
- **KV data layer** (`src/lib/kv.ts`): Check storage with 90-day TTL via `kv.expire`, status read/write, incident storage with `lset` for in-place resolution (scans up to 200 items), uptime percentage calculation, `getChecksForPeriod` using `zrange` with `{ byScore: true }`
- **Cron endpoint** (`src/app/api/cron/route.ts`): CRON_SECRET validation via `crypto.timingSafeEqual`, iterates all 3 services, per-service error handling catches failures and records `healthy: null`, uses `logForDebugging`
- **Status API** (`src/app/api/status/route.ts`): Returns services with status + uptime percentages + 20 recent incidents
- **Status page UI** (`src/app/page.tsx`): Async server component with `force-dynamic`, fetches directly from KV for each service (status, uptimePercentage, checks), renders all components
- **Components**: `status-card.tsx` (green/red/gray status dot, response time, uptime %), `uptime-bar.tsx` (green/red/yellow/gray day segments), `incident-timeline.tsx` (timestamps, resolved/ongoing, downtime duration via `formatDuration`)
- **Types** (`src/types/index.ts`): ServiceConfig, HealthCheckRecord, ServiceStatus, ServiceState, Incident — all correct
- **Service config** (`src/lib/services.ts`): 3 services matching spec exactly (exsecute.com/health, app.exsecute.com, api.exsecute.com/health), failureThreshold=3, recoveryThreshold=2
- **GitHub Actions** (`.github/workflows/health-check.yml`): `*/5 * * * *` cron, `Bearer $CRON_SECRET` auth, env vars from secrets, workflow_dispatch enabled
- **Deployment docs** (`README.md`): Vercel setup, KV provisioning, AWS SES, GH Actions secrets, DNS CNAME
- **Brand colors**: CSS variables in `globals.css` (navy #003d7a, cyan #00acc1, green #10b981) with `@theme inline` for Tailwind 4; used as `text-navy`, `text-green`, `bg-green` in components
- **Security**: semgrep rules for no-console and fetch credentials, timing-safe cron auth, external fetches use `credentials: 'omit'`, no direct `console.*` in any source file
- **.env.example**: All 7 required env vars documented (CRON_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, ALERT_RECIPIENTS)
- **No TODOs, FIXMEs, HACKs, or placeholders** found in `src/`

### Remaining Tasks (Priority Order)

- [x] **P1: Duplicate JSDoc comment in `src/lib/kv.ts`** — Removed orphaned JSDoc block.
- [x] **P2: Duplicate `formatDuration()` implementation** — Extracted to `src/lib/format.ts`, imported from `email.ts` and `incident-timeline.tsx`. Added 8 tests.
- [x] **P3: Test coverage — status API error scenarios** — Added KV error propagation test.
- [x] **P4: Test coverage — cron route check-cycle** — Added response format validation and individual service failure handling tests.
- [x] **P5: Test coverage — status page component** — Added 4 tests: service cards rendering, incident timeline, empty state, down state message.
- [x] **P6: CI/CD workflow** — Added `.github/workflows/ci.yml` running `npm run ci` on push/PR to main.
- [x] **P7: Responsive design polish** — Added `md:` breakpoint classes for font sizes, spacing, and padding.
- [x] **P8: Uptime percentage precision** — Changed to one decimal place (`Math.round(x * 1000) / 10`). Added test for non-integer percentages.

### Noted but Acceptable (No Action Required)

- **Hardcoded service URLs** (`src/lib/services.ts`): These are static eXsecute services — env var configuration would add complexity with no benefit for v1.
- **Hardcoded email sender** (`src/lib/email.ts:5`): `status@exsecute.com` is the correct sender. No need to configure in v1.
- **Incident ID uses `Date.now()`** (`src/lib/health-check.ts:89`): Collision risk is negligible — would require two services transitioning in the same millisecond. Acceptable for v1.
- **`bg-red-500` used instead of CSS variable**: The brand palette defines navy, cyan, and green — there is no brand red. Using Tailwind's `red-500` for error/down states is the correct approach.
- **Semgrep fetch rule breadth**: The `fetch-with-options-missing-credentials` rule warns broadly. Since the codebase only has one fetch call (external health checks with `credentials: 'omit'`), this is adequate for v1.

## Known Issues

- **Semgrep fetch credentials rule** — Health checks use `credentials: 'omit'` explicitly for external URLs. This is correct per CLAUDE.md.
- **npm cache permissions** — Root-owned files in `~/.npm`. Use `npm_config_cache=/private/tmp/claude-501/npm-cache` as workaround.

## Completed Phases (Reference)

### Phase 1: Project Initialization & Test Framework
- [x] Next.js 15 + TypeScript + App Router
- [x] Tailwind CSS 4 with brand CSS variables
- [x] Vitest + npm scripts (test, type-check, lint, build, ci)
- [x] .env.example, .gitignore, CLAUDE.md, knip.config.ts

### Phase 2: Types & Data Models
- [x] TypeScript types: HealthCheckRecord, ServiceStatus, Incident, ServiceConfig
- [x] Service configuration constants (3 services)
- [x] Unit tests for types and service config

### Phase 3: Data Layer (Vercel KV)
- [x] KV client wrapper with 90-day TTL
- [x] Status read/write, incident storage, uptime calculation
- [x] Unit tests for KV layer

### Phase 4: Health Check Engine
- [x] 10s timeout, credentials: 'omit', response time tracking
- [x] Consecutive failure/recovery threshold logic
- [x] State transition detection, incident creation/resolution
- [x] Unit tests for health check logic

### Phase 5: Email Alerting (AWS SES)
- [x] SES integration, down/recovery templates
- [x] 1-hour cooldown, separate keys per event type
- [x] Unit tests for alerting

### Phase 6: API Routes
- [x] Authenticated cron endpoint with timingSafeEqual
- [x] Public status API endpoint
- [x] Integration tests for both routes

### Phase 7: Status Page UI
- [x] Server component page, status cards, uptime bar, incident timeline
- [x] Component tests

### Phase 8: GitHub Actions Workflow
- [x] 5-minute cron schedule, CRON_SECRET auth

### Phase 9: Deployment & Configuration
- [x] README deployment docs, env vars documented

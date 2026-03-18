## Build & Validation

- **Full verification: `make agent-verify`** (tests + typecheck + lint + security)
- Security only: `make agent-security`
- Verification gate: `ralph/verification-gates/verify.sh`

Individual commands:
- Tests: `npm test`
- Typecheck: `npm run type-check`
- Lint: `npm run lint`
- Build: `npm run build`
- Full CI: `npm run ci`

## Source

Application source code is in `src/`.

## Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/app/api/cron/` — Authenticated cron health check endpoint
- `src/app/api/status/` — Public status API endpoint
- `src/components/` — React components (status cards, uptime bar, incident timeline)
- `src/lib/` — Utilities (KV client, health check engine, email, debug logger)
- `src/types/` — TypeScript type definitions

## Codebase Patterns

- New API route? Study `src/app/api/status/route.ts` — match its structure exactly.
- New component? Study `src/components/status-card.tsx` — match its patterns exactly.
- New utility? Study `src/lib/health-check.ts` — match its patterns exactly.
- Modifying a file? Read the entire file first. Preserve all existing error handling, loading states, and user-facing feedback.

## Project Guardrails

9999999. When modifying existing files, preserve all existing error handling. Never remove a working catch block, error display, toast notification, or loading/error state without an equivalent or better replacement.
99999999. When authoring tests, capture the why — test the behaviors that matter, not implementation details.
999999999. This is a security consulting platform. Study `CLAUDE.md` at the repo root for security requirements. Verify: `credentials: 'include'` on all internal fetch calls, `credentials: 'omit'` on external health-check fetches, UUID validation before URL interpolation, CSV exports escape formula-injection characters, cron endpoint validates `CRON_SECRET` from Authorization header, no direct `console.*` — use `logForDebugging` from `src/lib/debug.ts`.

## Sandbox

If a command fails due to sandbox restrictions, work around it and continue.
Log blocked resources to `ralph/SANDBOX_VIOLATIONS.md` with the command and what you were trying to do.

## Operational Notes

- npm cache has root-owned files — use `npm_config_cache=/private/tmp/claude-501/npm-cache` for npm commands if needed
- Next.js 15 + Tailwind CSS 4 (uses `@tailwindcss/postcss` plugin, `@import "tailwindcss"` syntax)
- ESLint 9 flat config with `@eslint/eslintrc` FlatCompat for next config
- Alert cooldown uses separate keys per event type: `alert-cooldown:{serviceId}:down` and `alert-cooldown:{serviceId}:up`
- Cron auth uses crypto.timingSafeEqual for constant-time comparison
- Gitleaks `.gitleaks.toml` excludes `.next/` and `node_modules/` (build artifacts with auto-generated keys)
- Shared utility `src/lib/format.ts` for `formatDuration()` — used by email and incident timeline

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

- Pages: `src/app/`
- Components: `src/components/`
- Types: `src/types/`
- Utilities: `src/lib/`
- API Routes: `src/app/api/`

## Codebase Patterns

- New page? Study an existing page in `src/app/` -- match its structure exactly.
- New component? Study a similar component in `src/components/` -- match its patterns exactly.
- Modifying a file? Read the entire file first. Preserve all existing error handling, loading states, and user-facing feedback.

## Project Guardrails

- When modifying existing files, preserve all existing error handling. Never remove a working catch block, error display, toast notification, or loading/error state without an equivalent or better replacement.
- When authoring tests, capture the why -- test the behaviors that matter, not implementation details.
- This is a security consulting platform. Study `CLAUDE.md` at the repo root for security requirements. Verify: `credentials: 'omit'` on external fetch calls, cron endpoint auth via CRON_SECRET, no direct console.* (use logForDebugging).

## Sandbox

If a command fails due to sandbox restrictions, work around it and continue.
Log blocked resources to `ralph/SANDBOX_VIOLATIONS.md` with the command and what you were trying to do.

## Operational Notes

- npm cache has root-owned files — use `npm_config_cache=/private/tmp/claude-501/npm-cache` for npm commands if needed
- Next.js 15 + Tailwind CSS 4 (uses `@tailwindcss/postcss` plugin, `@import "tailwindcss"` syntax)
- ESLint 9 flat config with `@eslint/eslintrc` FlatCompat for next config
- Alert cooldown uses separate keys per event type: `alert-cooldown:{serviceId}:down` and `alert-cooldown:{serviceId}:up`
- Cron auth uses crypto.timingSafeEqual for constant-time comparison

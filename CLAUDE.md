# eXsecute Status — Project Conventions

## Security Requirements

- **fetch credentials**: All internal fetch calls must include `credentials: 'include'`. External health-check fetches must use `credentials: 'omit'`.
- **UUID validation**: Validate UUIDs before interpolating into URLs.
- **CSV formula injection**: Escape `=`, `+`, `-`, `@` prefixes in CSV exports.
- **Cron endpoint auth**: The `/api/cron` route must validate `CRON_SECRET` from the Authorization header before processing.
- **No direct console.\***: Use `logForDebugging` from `src/lib/debug.ts` (enforced by semgrep).

## Stack

- Next.js 15, App Router, TypeScript
- Tailwind CSS 4 with CSS variables for brand colors
- Upstash Redis for data storage
- AWS SES for email alerts
- Vitest + Testing Library for tests

## Brand Colors (CSS Variables)

- `--color-navy`: #003d7a
- `--color-cyan`: #00acc1
- `--color-green`: #10b981

## Commands

- `npm test` — run tests (Vitest)
- `npm run type-check` — TypeScript check
- `npm run lint` — ESLint
- `npm run build` — Next.js build
- `npm run ci` — full CI pipeline

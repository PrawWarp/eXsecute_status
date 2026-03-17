## Build & Validation

- Tests: `npm test`
- Typecheck: `npm run type-check`
- Lint: `npm run lint`
- Build: `npm run build`
- Full CI: `npm run ci`

## Key Directories

- Pages: `src/app/`
- Components: `src/components/`
- Types: `src/types/`
- Utilities: `src/lib/`
- API Routes: `src/app/api/`

## Operational Notes

- npm cache has root-owned files — use `npm_config_cache=/private/tmp/claude-501/npm-cache` for npm commands if needed
- Next.js 15 + Tailwind CSS 4 (uses `@tailwindcss/postcss` plugin, `@import "tailwindcss"` syntax)
- ESLint 9 flat config with `@eslint/eslintrc` FlatCompat for next config

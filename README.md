# eXsecute Status

Self-hosted uptime monitoring and status page for eXsecute services.

## Services Monitored

| Service | Health Endpoint |
|---------|----------------|
| Website | `https://exsecute.com/health` |
| App     | `https://app.exsecute.com` |
| API     | `https://api.exsecute.com/health` |

## Deployment

### 1. Vercel

Deploy as a standard Next.js app on Vercel. No `vercel.json` needed.

**Environment Variables** (set in Vercel dashboard):

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Shared secret for authenticating the health check cron endpoint |
| `KV_REST_API_URL` | Vercel KV REST API URL (auto-set when KV store is linked) |
| `KV_REST_API_TOKEN` | Vercel KV REST API token (auto-set when KV store is linked) |
| `AWS_ACCESS_KEY_ID` | AWS credentials for SES email sending |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for SES email sending |
| `AWS_REGION` | AWS region for SES (default: `us-east-1`) |
| `ALERT_RECIPIENTS` | Comma-separated email addresses (default: `info@exsecute.com`) |

### 2. Vercel KV

Create a KV store in the Vercel dashboard and link it to the project. The `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables are set automatically.

### 3. GitHub Actions Secrets

Set these in the repository settings under Secrets and Variables > Actions:

- `CRON_SECRET` — same value as the Vercel environment variable
- `STATUS_PAGE_URL` — the deployed URL (e.g., `https://status.exsecute.com`)

### 4. DNS

Add a CNAME record for `status.exsecute.com` pointing to `cname.vercel-dns.com`.

## Development

```bash
npm install
npm run dev      # Start development server
npm test         # Run tests
npm run lint     # Run ESLint
npm run type-check  # TypeScript check
npm run build    # Production build
npm run ci       # Full CI pipeline
```

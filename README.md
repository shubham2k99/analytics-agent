# GAnalyst

Ask questions about your website's Google Analytics 4 data in plain English, and get answers,
charts, and summaries back — powered by Claude with live tool-use access to the GA4 Data API.

## How it works

1. **Connect** — user signs in with Google and grants read-only Analytics access (OAuth).
2. **Pick a property** — if the account has multiple GA4 properties, the user chooses one.
3. **Ask** — the chat sends the question to Claude, which has two tools:
   - `list_ga4_properties` — list properties on the connected account
   - `run_ga4_report` — run a real GA4 report (metrics/dimensions/date ranges)
   Claude decides what data it needs, the backend calls the real GA4 Data API, and Claude
   turns the numbers into a written answer plus (optionally) a chart spec.
4. **Visualize** — any chart spec Claude returns renders live with Recharts (line/bar/pie).

## Setup

### 1. Google Cloud OAuth credentials

1. Go to Google Cloud Console -> create/select a project.
2. Enable the **Google Analytics Data API** and **Google Analytics Admin API**.
3. Go to **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**.
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
     (add your production URL too when you deploy)
4. Copy the Client ID and Client Secret.
5. Under **OAuth consent screen**, add the scope
   `https://www.googleapis.com/auth/analytics.readonly`, and add your Google account as a
   test user (while the app is in "Testing" publishing status).

### 2. Anthropic API key

Get one from the Claude Console (console.anthropic.com).

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and generate a
`SESSION_SECRET` (any random 32+ character string, e.g. `openssl rand -hex 32`).

### 4. Install & run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, click **Connect Google Analytics**, sign in, pick a property,
and start asking questions like:

- "How many active users did we get in the last 30 days?"
- "Show me a chart of sessions by day this month"
- "What are our top 5 traffic sources?"
- "Compare this month's users to last month"

## Notes / next steps for production

- **Sessions are stored in an encrypted cookie** (via `iron-session`), not a database — fine
  for a single-user demo, but for multiple users you'll likely want to persist Google refresh
  tokens server-side (e.g. Postgres) keyed by your own user accounts, rather than relying on
  the browser cookie.
- **Rate limits / caching** — GA4 Data API and Claude API both have rate limits; consider
  caching recent report results if you expect repeated similar questions.
- **Scheduled reports** — the current build is chat-only; a natural extension is a cron job
  that runs a saved set of questions on a schedule and emails/Slacks a generated summary.
- **Multi-tenant auth** — add real user accounts (e.g. NextAuth) in front of the Google
  connection if this will be used by more than one person per deployment.

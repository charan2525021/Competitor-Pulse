# CompetitorPulse — Backend Documentation

Express + TypeScript backend with TinyFish browser automation, multi-provider LLM integration, SQLite persistence, SSE streaming, and nodemailer email campaigns.

---

## Server (server.ts)

Express app on port 3001 (configurable via `PORT` env var). Loads `.env` from project root. CORS enabled. JSON body parsing.

7 route groups mounted:

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/agent` | agent.routes | Competitive intelligence scans |
| `/api/leads` | leads.routes | LinkedIn lead search |
| `/api/forms` | forms.routes | Autonomous form filling |
| `/api/strategy` | strategy.routes | Market/distribution/weakness analysis |
| `/api/outreach` | outreach.routes | Email campaigns (sender + campaign CRUD + send) |
| `/api/dashboard` | dashboard.routes | Aggregated scan stats |
| `/api/store` | store.routes | SQLite persistence (config + collections) |

Health check: `GET /api/health`

---

## Controllers

### agent.controller.ts

In-memory `runStore` Map keyed by UUID run IDs. Each run tracks: logs array, done flag, CompetitorIntel reports, AbortController, TinyFish run ID.

**startAgent** — Receives prompt + filters + LLM config + TinyFish API key. Sets runtime LLM config and TinyFish key. Two modes:
- Direct URLs mode: skips LLM planning, builds plan from provided URLs
- Smart mode: calls `generatePlan()` via LLM to identify competitors and tasks

Executes `executeIntelPlan()` from orchestrator asynchronously. Returns runId immediately.

**streamLogs** — SSE endpoint. Polls run's logs array every 150ms. Sends `{type:"log", message}` events. On completion, strips internal TinyFish metadata (`_progressMessages`, `_progressData`) and sends `{type:"complete", reports}`.

**cancelAgent** — Calls `cancelTinyFishRun()` with captured TinyFish run ID, then aborts local AbortController. Sets `run.done = true`.

**getAllRunReports** — Exposes all runs for dashboard aggregation.

### strategy.controller.ts

In-memory `strategyStore`. Three strategy tools, each making 3 sequential TinyFish web research calls:

- **marketBreakdown** — Google (market size), ProductHunt (trending products), Google (funding data)
- **distributionPlan** — Google (marketing strategies), Reddit (community insights), Google (content patterns)
- **competitorWeakness** — Google (top competitors), G2 (negative reviews), Google (pricing gaps)

After web research, calls `callGroq()` with a structured JSON prompt to generate the final analysis. Each tool has a specific JSON schema for its output (TAM/SAM/SOM, channels, competitors, etc.).

### leads.controller.ts

**searchLeads** — Sends TinyFish agent to LinkedIn to search for people matching the query. LLM extracts structured lead data (name, company, role, email, LinkedIn URL). Falls back to mock leads on error.

**generatePossibleEmails** — Generates email permutations from name + company: `first.last@domain.com`, `firstlast@domain.com`, `flast@domain.com`, etc.

**sendOutreach** — Legacy endpoint (demo mode, logs to console). Real email sending is in outreach.controller.

### forms.controller.ts

**resolveCompanyUrl** — Uses LLM to guess the most likely URL for a company + form type combination. Falls back to `https://www.{sanitized}.com`.

**submitFormFill** — Accepts company name or URL + form type + profile. Resolves URL if needed, builds a detailed prompt with profile data and form-type-specific instructions, sends TinyFish agent. LLM extracts filled fields, confirmation messages, errors.

**buildFormPrompt** — Constructs TinyFish goal prompt with profile info and type-specific instructions for 8 form types. Adds URL discovery prefix when navigating from homepage.

### outreach.controller.ts

CRUD for sender identities and campaigns. Masks `gmailAppPassword` in GET responses. Validates Gmail App Password is provided when `useGmailSmtp` is true.

### dashboard.controller.ts

Aggregates stats from all completed agent runs: total scans, competitors, pricing pages, jobs, reviews, blog posts, features. Returns per-scan breakdown.

### store.controller.ts

Generic CRUD for 6 allowed collections: history, intel, leads, leadHistory, fillHistory, formProfiles. Config endpoint for app settings. Delete requires `x-user-role: admin` header.

---

## Services

### tinyfish.service.ts

Core browser automation integration.

**runTinyFishAgent(url, goal, onStream, options)** — Posts to `https://agent.tinyfish.ai/v1/automation/run-sse` with API key. Reads SSE stream, parses events:

| Event Type | Handling |
|-----------|----------|
| STARTED | "AI agent started working" |
| STREAMING_URL | Extracts `streaming_url` field, forwards as live view link |
| PROGRESS | Captures purpose/message/data/content for LLM context |
| HEARTBEAT | Ignored |
| COMPLETE | Captures result/output/answer/text, logs keys for debugging |
| ERROR | Forwards error message |

Captures TinyFish `run_id` from SSE events and response headers. Links external AbortSignal to internal controller.

**cancelTinyFishRun(runId)** — Posts to `https://agent.tinyfish.ai/v1/runs/{id}/cancel`. Logs response status and body.

**extractResultData(completeEvent)** — Recursively collects all objects and strings from the COMPLETE event. Tries JSON extraction from strings.

**llmExtract(completeEvent, extractionPrompt)** — Builds context from progress messages + progress data + COMPLETE event. Sends to current LLM with extraction prompt. Tries multiple JSON parsing strategies: direct parse, code block extraction, regex match for `{...}` or `[...]`.

**callCurrentLLM** — Routes to Groq, OpenAI, or Ollama based on runtime config.

### agent.orchestrator.ts

**executeIntelPlan(plan, onLog, signal, onRunId)** — Iterates competitors × tasks. For each task, calls the appropriate scraper. Each scraper:
1. Logs start
2. Inserts "pending" activity to DB
3. Calls `runTinyFishAgent` with task-specific prompt
4. Tries `extractResultData` for direct extraction
5. Falls back to `llmExtract` with company-aware prompt
6. Normalizes data structure
7. Inserts "success" activity to DB

6 scrapers: `scrapePricing`, `scrapeJobs`, `scrapeReviews`, `scrapeBlog`, `scrapeFeatures`, `scrapeSocial`.

LLM fallback prompts include the company name and ask the LLM to use its knowledge to provide realistic data when TinyFish extraction is incomplete.

### outreach.service.ts

In-memory stores for sender identities, campaigns, and campaign logs.

**SenderIdentity** — id, fromName, fromEmail, useGmailSmtp flag, optional gmailAppPassword.

**Campaign** — id, name, subject, body, senderId, status (draft/sending/sent/failed), recipients array with per-recipient status, stats (total/sent/failed).

**sendCampaign** — Two transport modes:
- Gmail SMTP: `smtp.gmail.com:587` with App Password auth. Verifies connection before sending.
- Direct transport: `nodemailer.createTransport({ direct: true })`. Resolves MX records locally.

Personalizes subject and body with `{{name}}`, `{{first_name}}`, `{{company}}`, `{{role}}`, `{{email}}`. Sends sequentially with 800ms delay between emails. Logs every send/fail.

### store.ts

SQLite persistence via `better-sqlite3`.

**Database**: `backend/data/store.db`. WAL mode enabled.

**Tables**:
- `collections` — (name TEXT, id TEXT, data TEXT, created_at TEXT). Primary key: (name, id).
- `config` — (key TEXT PRIMARY KEY, data TEXT). Single row with key='main'.

**Auto-migration**: On startup, imports existing JSON files (history.json, intel.json, etc.) into SQLite if the collection is empty.

**Functions**: `loadStore`, `saveStore` (transactional replace-all), `appendToStore`, `removeFromStore`, `loadConfig`, `saveConfig`.

All queries use prepared statements for performance.

---

## LLM Layer

### groq.client.ts

Runtime config stored in module-level variable. `setLLMConfig()` / `getLLMConfig()` for per-request config from frontend.

**callGroq** — Posts to `https://api.groq.com/openai/v1/chat/completions`. Uses runtime API key if provider is "groq", falls back to `GROQ_API_KEY` env var. Supports JSON mode via `response_format: { type: "json_object" }`. Default model: `llama-3.3-70b-versatile`.

### openai.client.ts

**callOpenAI** — Posts to `https://api.openai.com/v1/chat/completions`. Same runtime config pattern. Default model: `gpt-3.5-turbo`.

### ollama.client.ts

**callOllama** — Posts to `{OLLAMA_BASE_URL}/api/generate`. Default: `http://localhost:11434`. Default model: `llama3.1`. Uses `format: "json"` for JSON mode.

### planner.ts

**generatePlan** — Calls LLM with structured prompt to identify competitors and tasks from natural language input. Falls back through Groq → OpenAI → default plan.

**KNOWN_URLS** — 90+ hardcoded company→URL mappings (Slack, Notion, Stripe, etc.) to avoid Google search URL issues.

**resolveUrl** — Exact and partial match against KNOWN_URLS.

**getDefaultPlan** — Extracts company names from input by matching against KNOWN_URLS, then falls back to word extraction.

### prompts.ts

**buildPlannerPrompt** — Structured prompt with critical rules: use real homepage URLs (never Google search URLs), respect task filters and max competitors.

**buildSummaryPrompt** — Executive summary prompt (currently unused).

---

## Database Layer

### db/index.ts

PostgreSQL connection pool via `pg`. Used for the `leads` and `activities` tables (optional — app works without it).

### db/queries.ts

All queries wrapped in `safeQuery` that catches errors silently (database may not be running).

- `insertLead`, `checkLeadExists`, `updateLeadStatus`, `getLeads` — CRUD for leads table
- `insertActivity` — Logs agent actions (pricing/jobs/reviews/etc.) with status and details
- `getDashboardStats` — Aggregates from activities table

### db/schema.sql

PostgreSQL schema:
- `leads` — id, company, name, role, email, source, status, timestamps
- `activities` — id, lead_id (FK), action, status, details (JSONB), timestamp
- Indexes on leads.status, leads.company, activities.lead_id, activities.action

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `TINYFISH_API_KEY` | Yes* | — | TinyFish browser automation |
| `GROQ_API_KEY` | Yes* | — | Groq LLM (default provider) |
| `OPENAI_API_KEY` | No | — | OpenAI LLM (alternative) |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Local Ollama LLM |
| `DATABASE_URL` | No | — | PostgreSQL connection (optional) |
| `PORT` | No | `3001` | Server port |

*Can also be set at runtime via the frontend Settings panel. Runtime keys are stored in `process.env.TINYFISH_API_KEY_RUNTIME` and the LLM runtime config module variable.

---

## In-Memory State

Each controller maintains its own in-memory Map for active runs:

| Controller | Store | Key | Tracks |
|-----------|-------|-----|--------|
| agent | `runStore` | UUID | logs, done, reports, abortController, tinyFishRunId |
| strategy | `strategyStore` | UUID | logs, done, result, abortController, tinyFishRunId |
| leads | `leadRunStore` | UUID | logs, done, leads, abortController, tinyFishRunId |
| forms | `formRunStore` | UUID | logs, done, result, abortController, tinyFishRunId |
| outreach | `senderIdentities`, `campaigns`, `campaignLogs` | prefixed UUID | sender configs, campaign state, send logs |

All in-memory state is lost on server restart. Persistent data is in SQLite via the store service.

---

## SSE Pattern

All long-running operations follow the same pattern:

1. POST endpoint receives request, creates run in memory, returns `{ success: true, runId }` immediately
2. Async execution begins (TinyFish calls, LLM calls)
3. Progress pushed to `run.logs` array
4. GET `/logs/:runId` SSE endpoint polls logs every 150ms
5. On completion, sends final `{type:"complete", ...data}` event and closes stream
6. Cancel endpoint aborts local controller + calls TinyFish cancel API

---

## Build & Dev

```bash
npm run dev      # tsx watch src/server.ts (hot reload)
npm run build    # tsc → dist/
npm run start    # node dist/server.js (production)
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| express | HTTP server + routing |
| cors | Cross-origin requests |
| dotenv | Environment variable loading |
| better-sqlite3 | SQLite database (embedded, no server) |
| nodemailer | Email sending (direct transport + Gmail SMTP) |
| uuid | Run ID generation |
| pg | PostgreSQL client (optional, for leads/activities tables) |
| tsx | TypeScript execution with watch mode |

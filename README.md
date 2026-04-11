# CompetitorPulse

Autonomous competitive intelligence agent powered by TinyFish Web Agent API. Navigates real websites, extracts pricing/jobs/reviews/blog data, fills forms, generates leads, runs strategy analysis, and sends email campaigns — all from one dashboard.

Built for the TinyFish Hackathon 2026.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd Competitor-Pulse

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Create `.env` file in project root

```env
# Required — TinyFish Web Agent (browser automation)
TINYFISH_API_KEY=your-tinyfish-api-key

# Required — LLM for planning and data extraction (pick one)
GROQ_API_KEY=your-groq-api-key

# Optional — Alternative LLM providers
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Server port
PORT=3001
```

### 3. Get API Keys

| Key | Where to get it | Cost |
|-----|----------------|------|
| TinyFish API Key | [tinyfish.ai](https://tinyfish.ai) | Free tier available |
| Groq API Key | [console.groq.com](https://console.groq.com) | Free |
| OpenAI API Key | [platform.openai.com](https://platform.openai.com) | Pay-per-use |

> You can also enter API keys directly in the app's Settings panel (top-right gear icon) instead of using `.env`. Keys entered in the UI are stored in SQLite and sent with each request.

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

### 5. Login

Default credentials: any username + any password (demo auth).
Default role is `admin` which has full delete access.

---

## Features

### Agent — Competitive Intelligence Scanner
Enter a natural language query like "Analyze Slack and Notion pricing" or paste competitor URLs directly. The system:
1. LLM generates an execution plan (which competitors, which data to collect)
2. TinyFish web agent navigates each competitor's real website
3. Progress streams to the UI via Server-Sent Events in real-time
4. LLM extracts structured data from the agent's findings
5. Results displayed as interactive intel reports

Collects: pricing plans, job postings, G2 reviews, blog posts, product features, social media profiles.

### Strategy Tools
Three AI-powered analysis tools that use TinyFish to research the web and LLM to generate structured insights:
- **Market Breakdown** — TAM/SAM/SOM, trends, underserved opportunities, money flow
- **Distribution Plan** — channels, content formats, 30-day execution plan, viral hooks
- **Competitor Weakness Map** — top 5 competitors analyzed with strengths, weaknesses, positioning gaps, domination strategy

Strategy results are saved to history and automatically pushed to the Intel Database.

### Lead Generation
- LinkedIn-based prospect search via TinyFish
- Email suggestion engine (generates possible emails from name + company)
- Bulk lead management with select/deselect
- Full campaign system: create sender identity → compose email with template variables → send to selected leads

### Email Campaigns
Two sending modes:
- **Direct Transport** — sends emails directly from your machine via MX resolution. No SMTP server needed. Works on Windows.
- **Gmail SMTP** — toggle on Gmail SMTP, enter your Gmail App Password. Uses `smtp.gmail.com:587`.

Template variables: `{{name}}`, `{{first_name}}`, `{{company}}`, `{{role}}`, `{{email}}`

Campaign tracking: per-recipient sent/failed status, send logs, stats dashboard.

### Form Filler
Enter a company name and form type. The AI agent:
1. Resolves the company's website URL via LLM
2. Navigates to find the correct form page
3. Fills all fields using your saved profile
4. Submits the form

Supports: demo requests, contact forms, newsletter signups, partnership inquiries, pricing requests, job applications, free trial signups, custom forms.

### Intel Database
All collected data (from Agent scans, Strategy analyses, Lead searches, Form fills) is stored and browsable. Filterable by type: pricing, jobs, reviews, blog, features, social, leads, forms, strategy. Grouped by company.

### Dashboard
Overview stats: total scans, competitors tracked, pricing pages found, job postings, reviews. Per-scan breakdown with data coverage charts.

---

## Architecture

```
Frontend (React 19 + Vite + Tailwind)
  ├── Pages: Agent, Dashboard, Strategy, Lead Gen, Forms, Intel, Docs
  ├── Real-time log streaming via SSE (Server-Sent Events)
  ├── Dark/Light theme, scroll animations, collapsible sidebar
  └── localStorage + backend sync for persistence

Backend (Express + TypeScript)
  ├── /api/agent     — competitive intelligence scans
  ├── /api/strategy  — market/distribution/weakness analysis
  ├── /api/leads     — LinkedIn lead search
  ├── /api/forms     — autonomous form filling
  ├── /api/outreach  — email campaigns (sender identity + campaign CRUD + send)
  ├── /api/dashboard — aggregated stats
  └── /api/store     — SQLite persistence (config + collections)

External Services
  ├── TinyFish API — browser automation (navigates real websites)
  ├── Groq API     — LLM for planning + data extraction (default)
  ├── OpenAI API   — alternative LLM provider
  └── Ollama       — local LLM option
```

---

## API Endpoints

### Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/start` | Start a competitive intelligence scan |
| GET | `/api/agent/logs/:runId` | SSE stream of scan progress |
| GET | `/api/agent/reports/:runId` | Get scan results |
| POST | `/api/agent/cancel/:runId` | Cancel scan (also cancels TinyFish run) |

### Strategy
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/strategy/run` | Start a strategy analysis |
| GET | `/api/strategy/logs/:runId` | SSE stream of analysis progress |
| POST | `/api/strategy/cancel/:runId` | Cancel analysis |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/leads/search` | Start a LinkedIn lead search |
| GET | `/api/leads/logs/:runId` | SSE stream of search progress |
| GET | `/api/leads/results/:runId` | Get search results |
| POST | `/api/leads/cancel/:runId` | Cancel search |

### Forms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/forms/fill` | Start autonomous form fill |
| GET | `/api/forms/logs/:runId` | SSE stream of form fill progress |
| POST | `/api/forms/cancel/:runId` | Cancel form fill |

### Outreach (Email Campaigns)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/outreach/senders` | Create sender identity |
| GET | `/api/outreach/senders` | List sender identities |
| DELETE | `/api/outreach/senders/:id` | Delete sender identity |
| POST | `/api/outreach/campaigns` | Create campaign |
| GET | `/api/outreach/campaigns` | List campaigns |
| GET | `/api/outreach/campaigns/:id` | Get campaign details |
| DELETE | `/api/outreach/campaigns/:id` | Delete campaign |
| POST | `/api/outreach/campaigns/:id/send` | Send campaign |
| GET | `/api/outreach/campaigns/:id/logs` | Get send logs |

### Store (Persistence)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/store/config` | Get app config |
| POST | `/api/store/config` | Save app config |
| GET | `/api/store/:collection` | Get collection data |
| POST | `/api/store/:collection` | Save collection data |
| DELETE | `/api/store/:collection/:id` | Delete item from collection |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get aggregated dashboard stats |

---

## Project Structure

```
Competitor-Pulse/
├── backend/
│   ├── data/
│   │   └── store.db              # SQLite database (auto-created)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── agent.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── forms.controller.ts
│   │   │   ├── leads.controller.ts
│   │   │   ├── outreach.controller.ts
│   │   │   ├── store.controller.ts
│   │   │   └── strategy.controller.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── queries.ts
│   │   │   └── schema.sql
│   │   ├── llm/
│   │   │   ├── groq.client.ts
│   │   │   ├── ollama.client.ts
│   │   │   ├── openai.client.ts
│   │   │   ├── planner.ts
│   │   │   └── prompts.ts
│   │   ├── routes/
│   │   │   ├── agent.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── forms.routes.ts
│   │   │   ├── leads.routes.ts
│   │   │   ├── outreach.routes.ts
│   │   │   ├── store.routes.ts
│   │   │   └── strategy.routes.ts
│   │   ├── services/
│   │   │   ├── agent.orchestrator.ts
│   │   │   ├── outreach.service.ts
│   │   │   ├── store.ts
│   │   │   └── tinyfish.service.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── charts/               # ECharts dashboard charts
│   │   ├── components/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── CompetitorCard.tsx
│   │   │   ├── FishAnimation.tsx
│   │   │   ├── HistoryList.tsx
│   │   │   ├── IntelDataPanel.tsx
│   │   │   ├── LiveLogs.tsx
│   │   │   ├── ScrollReveal.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── StatCard.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAgentLogs.ts
│   │   │   └── useScrollReveal.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Docs.tsx
│   │   │   ├── FormFiller.tsx
│   │   │   ├── Home.tsx          # Agent page
│   │   │   ├── IntelPage.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LeadGen.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── Strategy.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env                          # API keys (create this)
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Backend | Node.js, Express, TypeScript |
| LLM | Groq (default), OpenAI, Ollama |
| Browser Automation | TinyFish Web Agent API |
| Email | Nodemailer (direct transport + Gmail SMTP) |
| Database | SQLite (better-sqlite3) |
| Real-time | Server-Sent Events (SSE) |
| Icons | Lucide React |
| Charts | ECharts |

---

## Access Control

| Action | All Users | Admin Only |
|--------|-----------|------------|
| View all data | ✅ | ✅ |
| Run scans/searches | ✅ | ✅ |
| Create campaigns | ✅ | ✅ |
| Delete own history | ✅ | ✅ |
| Delete intel records | ❌ | ✅ |
| Delete leads | ❌ | ✅ |
| Clear all data | ❌ | ✅ |

---

## TinyFish Live View

When TinyFish runs a browser automation, it sends a `STREAMING_URL` event with a URL to watch the browser live. This appears in the log stream as a clickable link. Click the chevron to expand and see an embedded iframe of the live browser session.

The streaming URL is valid for 24 hours after the run completes.

---

## Example Prompts

```
Analyze Slack, Notion, and Linear — pricing, jobs, reviews
Compare Figma vs Sketch — features and pricing
What positions is Stripe hiring for?
Check reviews for HubSpot on G2
Research Salesforce, HubSpot, and Pipedrive
```

---

## License

Built for the TinyFish Hackathon 2026.

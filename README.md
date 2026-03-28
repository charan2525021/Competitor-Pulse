# CompetitorPulse

**Autonomous Competitive Intelligence Agent powered by TinyFish Web Agent API**

CompetitorPulse is a real-world application that uses browser automation to navigate live websites, extract competitive intelligence, fill forms, and generate leads — all autonomously. Built for the TinyFish Hackathon.

---

## What is this?

CompetitorPulse solves a real business problem: companies spend 10-20 hours/week manually monitoring competitors — checking pricing pages, reading blog posts, tracking job postings, and monitoring review sites. This tool automates all of that using an AI web agent that navigates real websites.

Unlike simple chatbots or API wrappers, CompetitorPulse actually goes out into the live web:
- Navigates dynamic SPAs, handles pop-ups and cookie banners
- Extracts pricing plans from real pricing pages
- Scrapes job postings from careers pages
- Reads G2 reviews with ratings and snippets
- Finds blog posts and product announcements
- Discovers social media profiles
- Fills contact forms, demo requests, and signups autonomously

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Agent    │ │  Forms   │ │ Lead Gen │ │  Intel │ │
│  │  Page     │ │  Filler  │ │  Page    │ │  Data  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │             │            │            │       │
│  ┌────┴─────────────┴────────────┴────────────┴────┐ │
│  │              SSE (Server-Sent Events)            │ │
│  │           Real-time log streaming                │ │
│  └──────────────────┬──────────────────────────────┘ │
└─────────────────────┼───────────────────────────────┘
                      │ HTTP + SSE
┌─────────────────────┼───────────────────────────────┐
│                 Backend (Express)                     │
│  ┌──────────────────┴──────────────────────────────┐ │
│  │              API Controllers                     │ │
│  │   /api/agent  /api/forms  /api/leads  /api/store│ │
│  └──────┬───────────┬───────────┬──────────────────┘ │
│         │           │           │                     │
│  ┌──────┴───┐ ┌─────┴────┐ ┌───┴──────┐             │
│  │ Planner  │ │ TinyFish │ │  Store   │             │
│  │  (LLM)   │ │ Service  │ │ (JSON)   │             │
│  └──────┬───┘ └─────┬────┘ └──────────┘             │
│         │           │                                 │
│  ┌──────┴───┐       │                                │
│  │ Groq /   │       │                                │
│  │ OpenAI / │       ▼                                │
│  │ Ollama   │  TinyFish API                          │
│  └──────────┘  (Browser Automation)                  │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. User enters a query (e.g., "Analyze Slack and Notion pricing")
2. LLM (Groq/OpenAI) generates an execution plan with competitor URLs and tasks
3. TinyFish web agent navigates each competitor's website in a real browser
4. Agent progress streams to frontend via SSE in real-time
5. LLM extracts structured data from the agent's findings
6. Results displayed as interactive intel reports
7. All data persisted to backend JSON files

---

## Features

### Agent (Competitive Intelligence)
- **Pricing Analysis** — Navigates to pricing pages, extracts plan names, prices, billing periods, and features
- **Job Postings** — Finds careers pages, extracts open positions with titles, departments, and locations
- **G2 Reviews** — Searches G2.com, extracts ratings, review counts, and recent review snippets
- **Blog/News** — Finds blog pages, extracts recent posts with titles, dates, and summaries
- **Features** — Visits product pages, extracts key capabilities and feature lists
- **Social Media** — Discovers social profiles (Twitter, LinkedIn, YouTube) with follower counts

### Form Filler
- Autonomous form filling on any website
- Supports: Demo requests, Contact forms, Newsletter signups, Partnership inquiries, Pricing requests, Job applications, Free trial signups, Custom forms
- AI resolves company names to correct URLs automatically
- Tracks filled fields with exact website field labels and values

### Lead Generation
- LinkedIn-based prospect search
- Extracts names, companies, roles, emails, and LinkedIn URLs
- Email suggestions and manual email entry
- Bulk outreach capability

### Intel Data Store
- All gathered intelligence stored permanently (survives server restarts)
- Browse by type: Pricing, Jobs, Reviews, Blog, Features, Social, Leads, Forms
- Expandable detail view for each record
- Delete individual records

### Dashboard
- Visual overview of all scans
- Stat cards: Total scans, competitors tracked, pricing pages, job postings, reviews
- Scan history breakdown
- Data coverage charts

### Additional Features
- **Live Logs** — Real-time animated log display with typewriter effect, colored labels, and expandable details
- **Replay Demo** — Replay completed logs with full animation for demos
- **Dark/Light Theme** — Toggle between themes, defaults to light
- **Collapsible Sidebars** — Left (history) and right (settings) panels
- **LLM Provider Selection** — Groq, OpenAI, Anthropic, Google, Meta (Ollama)
- **API Key Management** — Masked input, saved locally and on backend
- **Persistent Storage** — All data saved to backend JSON files + localStorage

---

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### 1. Clone the repository
```bash
git clone <repo-url>
cd Lead-Gen
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

### 4. Configure environment
Create a `.env` file in the project root:
```env
TINYFISH_API_KEY=sk-tinyfish-your-key-here
GROQ_API_KEY=gsk_your-groq-key-here
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
PORT=3001
```

> You can also set API keys through the app's Settings panel (right sidebar).

---

## Running the Application

### Start the backend
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:3001`

### Start the frontend (in a separate terminal)
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

### Open in browser
Navigate to `http://localhost:5173`

---

## Configuration

### API Keys (Required)

| Key | Where to get it | Purpose |
|-----|-----------------|---------|
| **TinyFish API Key** | [tinyfish.ai](https://tinyfish.ai) | Powers browser automation (required) |
| **Groq API Key** | [console.groq.com](https://console.groq.com) | LLM for planning & extraction (recommended, free tier available) |
| **OpenAI API Key** | [platform.openai.com](https://platform.openai.com) | Alternative LLM provider |

### Two Input Modes

| Mode | Keys Needed | How it works |
|------|-------------|--------------|
| **Smart Mode** | TinyFish + LLM | Type natural language like "Analyze Slack and Notion" |
| **URL Mode** | TinyFish only | Enter competitor URLs directly |

### Settings Panel (Right Sidebar)

- **LLM Settings** — Choose provider (Groq/OpenAI/Anthropic/Google/Ollama), model, and API key
- **TinyFish API** — Enter your TinyFish API key
- **Max Competitors** — Limit competitors per scan (1-10)
- **Intel Tasks** — Toggle which data to gather (pricing, jobs, reviews, blog, features, social)
- **Execution Mode** — Visible (shows browser) or Headless (background)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Backend | Node.js, Express, TypeScript |
| LLM | Groq (Llama 3.3 70B), OpenAI, Ollama |
| Browser Automation | TinyFish Web Agent API |
| Icons | Lucide React |
| Streaming | Server-Sent Events (SSE) |
| Storage | JSON files (backend/data/) + localStorage |

---

## Project Structure

```
Lead-Gen/
├── backend/
│   ├── data/                    # Persistent JSON storage
│   ├── src/
│   │   ├── controllers/         # API route handlers
│   │   ├── llm/                 # LLM clients (Groq, OpenAI, Ollama)
│   │   ├── routes/              # Express routes
│   │   ├── services/            # Business logic
│   │   │   ├── agent.orchestrator.ts  # Main intel gathering engine
│   │   │   ├── tinyfish.service.ts    # TinyFish API integration
│   │   │   └── store.ts              # File-based persistence
│   │   └── server.ts            # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # Theme context
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page components
│   │   │   ├── Home.tsx         # Agent page
│   │   │   ├── FormFiller.tsx   # Form filling page
│   │   │   ├── LeadGen.tsx      # Lead generation page
│   │   │   ├── IntelPage.tsx    # Intel data browser
│   │   │   ├── Dashboard.tsx    # Analytics dashboard
│   │   │   └── Docs.tsx         # Documentation page
│   │   └── services/api.ts      # API client
│   └── package.json
├── .env                         # Environment variables
└── README.md
```

---

## Example Prompts

```
Analyze Slack, Notion, and Linear — pricing, jobs, reviews
Compare Figma vs Sketch — features and pricing
What positions is Stripe hiring for
Check reviews for HubSpot on G2
What has Linear announced recently on their blog
Research Salesforce, HubSpot, and Pipedrive
```

---

## License

Built for the TinyFish Hackathon 2026.

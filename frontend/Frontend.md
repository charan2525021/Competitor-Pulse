# CompetitorPulse — Frontend Documentation

React 19 + TypeScript + Vite 8 + Tailwind CSS 4 single-page application.

---

## Entry Point

`src/main.tsx` renders the app wrapped in two context providers:

```
<ThemeProvider>      ← dark/light theme toggle, persisted to localStorage
  <AuthProvider>     ← session-based auth with profile editing
    <App />          ← routing, state management, layout
  </AuthProvider>
</ThemeProvider>
```

---

## App.tsx — Root Component

The main orchestrator. Handles:

- BrowserRouter with 7 routes
- All shared state (history, leads, intel records, filters, strategy history, fill history, form profiles)
- Dual persistence: localStorage + backend SQLite via `/api/store` endpoints
- Backend data loading on mount (config, history, intel, leads, leadHistory, formProfiles, fillHistory, strategyHistory)
- Sidebar navigation with collapsible icons + tooltips
- Top bar with Settings, Theme toggle, API key status indicators, Profile dropdown
- Settings slide-out panel with admin "Clear All Data" button

### Routes

| Path | Component | Props |
|------|-----------|-------|
| `/` | Home | runId, history, filters, onReportsReady, onDeleteHistory, isAdmin |
| `/dashboard` | Dashboard | (none — fetches own data) |
| `/strategy` | Strategy | strategyHistory, setStrategyHistory, onResultReady |
| `/leads` | LeadGen | leads, leadHistory, leadRunId, onLeadsReady, isAdmin |
| `/forms` | FormFiller | profiles, fillHistory, onFormFillDone, onDeleteFillHistory, isAdmin |
| `/intel` | IntelPage | records, onDelete, isAdmin |
| `/docs` | Docs | (none) |

### State Flow

All intel data flows into `intelRecords` via callbacks:
- Agent scan results → `addReportsToIntel` (pricing, jobs, reviews, blog, features, social)
- Lead search results → `addLeadsToIntel`
- Form fill results → `addFormFillToIntel`
- Strategy results → `addStrategyToIntel`

### Access Control

`isAdmin` is derived from `user?.role === "admin"`. Controls:
- Intel record deletion (admin only)
- Lead deletion (admin only)
- Clear All Data button (admin only)
- History deletion (all users — their own data)

---

## Pages

### Home.tsx (Agent Page)

The main competitive intelligence scanner.

- ChatInput component with two modes: Smart (natural language) and URL-only
- SSE log streaming via `useAgentLogs` hook
- CompetitorCard components for structured intel reports
- Right panel with History list and Config tabs
- Stop button cancels both local stream and TinyFish remote run

### Dashboard.tsx

Stats overview with ScrollReveal animations.

- Fetches aggregated stats from `/api/dashboard/stats`
- StatCard grid: total scans, competitors, pricing pages, jobs, reviews
- DataCard grid: scan history, competitors tracked, intelligence breakdown (bar charts), data coverage (circle charts)
- Refresh button, loading state, empty state

### Strategy.tsx

Three AI-powered analysis tools.

- Tool selector: Market Breakdown, Distribution Plan, Competitor Weakness Map
- Analysis history with clickable items to reload past results
- SSE log streaming during analysis
- Rich result rendering: TAM/SAM/SOM cards, trends, opportunities, money flow, channels, viral hooks, 30-day plan, competitor analysis, positioning gaps, domination strategy
- Results automatically pushed to Intel Database

### LeadGen.tsx

Lead search + campaign system.

Two tabs:
1. **Leads & Search** — prospect search via TinyFish/LinkedIn, search results table, My Leads table with select/deselect, email editing with AI-suggested emails
2. **Campaigns & Outreach** — sender identity management (direct transport or Gmail SMTP toggle), campaign composer with template variables, campaign list with send/view/delete, campaign detail view with per-recipient status and send logs

Template variables: `{{name}}`, `{{first_name}}`, `{{company}}`, `{{role}}`, `{{email}}`

### FormFiller.tsx

Autonomous form filling.

- 8 form types: demo request, contact us, newsletter, partnership, pricing inquiry, job application, free trial, custom
- Profile management (create/edit/delete profiles with name, email, phone, company, job title, website, message)
- Company name input with LLM-powered URL resolution
- Fill history with expandable field details and confirmation messages
- Custom instructions support

### IntelPage.tsx

Browsable intel database.

- 10 filter tabs: All, Pricing, Jobs, Reviews, Blog, Features, Social, Leads, Forms, Strategy
- Company search
- Records grouped by company with collapse/expand
- Type-specific renderers for each data type
- Admin-only delete

### LandingPage.tsx

Public marketing page (shown before login).

- Hero section with animated stats
- Features grid (8 cards) with ScrollReveal
- How It Works steps with bounce animation
- Capabilities tabs (SPA Navigation, Form Filling, Lead Gen, Strategy)
- Pricing cards (Starter/Pro/Enterprise)
- Contact form
- Footer

### LoginPage.tsx

Simple login form. Default credentials: admin / admin.

### Docs.tsx

In-app documentation with collapsible sections covering getting started, API keys, input modes, intelligence tasks, app sections, strategy tools, settings, and example prompts.

---

## Components

### ChatInput.tsx
Dual-mode input: Smart mode (text input with sparkle icon) and URL mode (multiple URL fields with add/remove). Shows validation error banner when API keys are missing.

### CompetitorCard.tsx
Expandable card showing all intel for one competitor. Sections: pricing plans grid, job postings list, G2 reviews with star ratings, blog posts, features tags, social media profiles. Gradient accent bar, data point badges.

### LiveLogs.tsx
Real-time log viewer with:
- Typewriter text animation for new logs
- Icon + color coding per log type (search, navigate, pricing, jobs, reviews, etc.)
- Expandable detail view per log entry
- Live view iframe embed when TinyFish sends STREAMING_URL
- Replay Demo button for completed runs
- Progress bar animation during active runs

### HistoryList.tsx
Run history sidebar with status indicators (running/done/error), delete buttons, active run highlighting.

### ScrollReveal.tsx
IntersectionObserver-based scroll animation wrapper. 7 animation types: fade-up, fade-down, fade-left, fade-right, scale-up, zoom-rotate, bounce-up. Configurable delay and threshold.

### StatCard.tsx
Animated stat card with hover effects, shimmer animation, color-coded icons.

### SettingsPanel.tsx
Collapsible configuration sections:
- LLM Settings (provider dropdown, model dropdown, API key input)
- TinyFish API key
- Max Competitors slider (1-10)
- Intel Tasks toggles (6 task types)
- Execution Mode toggle (visible/headless)

Supports 5 LLM providers: Groq, OpenAI, Anthropic, Google, Meta (Ollama).

### FishAnimation.tsx
Collection of animated fish components:
- `FishJumpScene` — fish jumps in parabolic arc with water splash physics and content labels
- `SwimmingFish` — fish swimming across screen
- `AIParticles` — floating neural-net particles with connection lines
- `BrainAnimation` — pulsing brain with orbital rings
- `DataFetchFish` — small fish carrying data labels
- `LoadingFish` — fish loading spinner

### IntelDataPanel.tsx
Sidebar intel viewer with tab strip, record rows with expand/collapse, type-specific detail renderers.

---

## Context

### AuthContext.tsx
- `isAuthenticated` — boolean, stored in sessionStorage
- `user` — UserProfile (username, role, phone, loginTime)
- `login(username)` — restores saved profile from localStorage
- `logout()` — clears session
- `updateProfile(updates)` — saves to both sessionStorage and localStorage

### ThemeContext.tsx
- `theme` — "dark" | "light", persisted to localStorage
- `toggleTheme()` — switches theme, toggles `.dark` class on `<html>`

---

## Hooks

### useAgentLogs.ts
SSE connection manager for agent runs.
- Connects to `/api/agent/logs/:runId`
- Caches reports in localStorage
- Falls back to REST `/api/agent/reports/:runId` if SSE doesn't deliver reports
- Returns: `{ logs, isRunning, reports, clearLogs }`

### useScrollReveal.ts
IntersectionObserver hook.
- Returns `{ ref, isVisible }` — attach ref to element, isVisible triggers CSS transition
- Configurable threshold, rootMargin, once (default: true)
- `useRevealProps()` helper returns ready-to-spread className + style

---

## Services

### api.ts
All backend API calls:

| Function | Endpoint | Method |
|----------|----------|--------|
| `startAgent` | `/api/agent/start` | POST |
| `fetchRunReports` | `/api/agent/reports/:id` | GET |
| `fetchDashboardStats` | `/api/dashboard/stats` | GET |
| `createLogStream` | `/api/agent/logs/:id` | SSE |
| `cancelAgent` | `/api/agent/cancel/:id` | POST |
| `startLeadSearch` | `/api/leads/search` | POST |
| `createLeadLogStream` | `/api/leads/logs/:id` | SSE |
| `fetchLeadResults` | `/api/leads/results/:id` | GET |
| `cancelLeadSearch` | `/api/leads/cancel/:id` | POST |
| `startFormFill` | `/api/forms/fill` | POST |
| `createFormLogStream` | `/api/forms/logs/:id` | SSE |
| `cancelFormFill` | `/api/forms/cancel/:id` | POST |
| `startStrategy` | `/api/strategy/run` | POST |
| `createStrategyLogStream` | `/api/strategy/logs/:id` | SSE |
| `cancelStrategy` | `/api/strategy/cancel/:id` | POST |
| `saveSenderIdentity` | `/api/outreach/senders` | POST |
| `getSenderIdentities` | `/api/outreach/senders` | GET |
| `deleteSenderApi` | `/api/outreach/senders/:id` | DELETE |
| `createCampaignApi` | `/api/outreach/campaigns` | POST |
| `getCampaignsApi` | `/api/outreach/campaigns` | GET |
| `deleteCampaignApi` | `/api/outreach/campaigns/:id` | DELETE |
| `sendCampaignApi` | `/api/outreach/campaigns/:id/send` | POST |
| `getCampaignLogsApi` | `/api/outreach/campaigns/:id/logs` | GET |
| `loadConfig` | `/api/store/config` | GET |
| `saveConfig` | `/api/store/config` | POST |
| `loadCollection` | `/api/store/:name` | GET |
| `saveCollection` | `/api/store/:name` | POST |

TinyFish API key is read from localStorage (`cp_filters`) and sent with lead search and form fill requests.

---

## CSS (index.css)

### Theme System
CSS custom properties for light/dark themes. Variables: `--bg-primary`, `--bg-card`, `--bg-input`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--shadow-sm/md/lg`.

### Animation Library
- Page transitions: `fadeIn`, `slideInLeft`, `slideInRight`, `scaleIn`
- Log animations: `logRowEnter`, `logIconPop`, `logScanBar`, `logProgressBar`
- AI animations: `neuralPulse`, `neuralGlow`, `dataStream`, `orbitSpin`, `aiThink`, `particleFloat`, `brainPulse`, `float`, `floatSlow`, `glowPulse`, `slideUpBounce`, `sparkle`, `gradientShift`, `morphBlob`
- Scroll reveal: `scroll-hidden` → `scroll-revealed` with 7 animation variants (fade-up/down/left/right, scale-up, zoom-rotate, bounce-up)
- Nav: `navTabActivate`, `shimmer`
- Utility: `card-shimmer` hover effect, `page-enter`, `count-up`

### Landing Page Styles
Full set of styles for the public marketing page: nav, hero, features grid, how-it-works steps, capability tabs, pricing cards, contact form, footer. Responsive breakpoints at 768px.

### Login Page Styles
Centered card with gradient background, form fields, password toggle, loading spinner.

---

## Build & Dev

```bash
npm run dev      # Vite dev server on :5173 with proxy to :3001
npm run build    # tsc + vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

Vite config proxies `/api` to `http://localhost:3001`.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| react 19 | UI framework |
| react-dom 19 | DOM rendering |
| react-router-dom 7 | Client-side routing |
| tailwindcss 4 | Utility CSS |
| @tailwindcss/vite | Tailwind Vite plugin |
| lucide-react | Icon library (100+ icons used) |
| echarts | Charting library |
| echarts-for-react | React wrapper for ECharts |

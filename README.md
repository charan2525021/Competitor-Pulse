# 🚀 CompetitorPulse

### 🧠 Autonomous Competitive Intelligence Agent powered by TinyFish Web Agent API

---

## 🌟 What is this?

CompetitorPulse solves a real business problem: companies spend **10–20 hours/week** ⏳ manually monitoring competitors — checking pricing pages, reading blog posts, tracking job postings, and monitoring review sites.

🔥 This tool automates all of that using an AI web agent that navigates real websites.

---

### 💡 Unlike simple chatbots or API wrappers:

🌐 Navigates dynamic SPAs, handles pop-ups and cookie banners
💰 Extracts pricing plans from real pricing pages
💼 Scrapes job postings from careers pages
⭐ Reads G2 reviews with ratings and snippets
📰 Finds blog posts and product announcements
🔗 Discovers social media profiles
📩 Fills contact forms, demo requests, and signups autonomously

---

## 🏗️ Architecture

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
│  │           Real-time log streaming ⚡             │ │
│  └──────────────────┬──────────────────────────────┘ │
└─────────────────────┼───────────────────────────────┘
                      │ HTTP + SSE 🌐
┌─────────────────────┼───────────────────────────────┐
│                 Backend (Express) 🟢                 │
│  ┌──────────────────┴──────────────────────────────┐ │
│  │              API Controllers 🎮                  │ │
│  │   /api/agent  /api/forms  /api/leads  /api/store│ │
│  └──────┬───────────┬───────────┬──────────────────┘ │
│         │           │           │                     │
│  ┌──────┴───┐ ┌─────┴────┐ ┌───┴──────┐             │
│  │ Planner  │ │ TinyFish │ │  Store   │             │
│  │  (LLM)   │ │ Service  │ │ (JSON) 💾│             │
│  └──────┬───┘ └─────┬────┘ └──────────┘             │
│         │           │                                 │
│  ┌──────┴───┐       │                                │
│  │ Groq /   │       │                                │
│  │ OpenAI / │       ▼                                │
│  │ Ollama   │  TinyFish API 🐟                       │
│  └──────────┘  (Browser Automation 🌍)              │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

1️⃣ User enters a query (e.g., "Analyze Slack and Notion pricing")
2️⃣ LLM (Groq/OpenAI) generates an execution plan with competitor URLs and tasks 🧠
3️⃣ TinyFish web agent navigates each competitor's website 🌐
4️⃣ Agent progress streams to frontend via SSE in real-time ⚡
5️⃣ LLM extracts structured data from the agent's findings 📊
6️⃣ Results displayed as interactive intel reports 🎨
7️⃣ All data persisted to backend JSON files 💾

---

## ✨ Features

### 🤖 Agent (Competitive Intelligence)

* 💰 Pricing Analysis
* 💼 Job Postings
* ⭐ G2 Reviews
* 📰 Blog/News
* 🧩 Features
* 🌐 Social Media

---

### 📝 Form Filler

✔️ Demo requests
✔️ Contact forms
✔️ Newsletter signups
✔️ Partnership inquiries
✔️ Pricing requests
✔️ Job applications
✔️ Free trial signups

🤖 AI resolves company names automatically + fills fields

---

### 🎯 Lead Generation

* 🔍 LinkedIn-based prospect search
* 📧 Email suggestions
* 📊 Bulk outreach capability

---

### 🗄️ Intel Data Store

📁 Persistent storage
📊 Categorized intel
🔍 Expandable records
🗑️ Delete records

---

### 📊 Dashboard

📈 Total scans
🏢 Competitors tracked
💰 Pricing pages
💼 Job postings
⭐ Reviews

---

### 🎨 Additional Features

⚡ Live Logs (real-time streaming)
🔁 Replay Demo
🌙 Dark/Light Theme
📂 Collapsible Sidebars
🔑 API Key Management
💾 Persistent Storage

---

## ⚙️ Installation

### 📋 Prerequisites

* Node.js 18+
* npm or yarn

---

### 📥 Clone the repository

```bash
git clone <repo-url>
cd Lead-Gen
```

---

### 📦 Install backend dependencies

```bash
cd backend
npm install
```

---

### 📦 Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

### 🔐 Configure environment

Create a `.env` file:

```env
TINYFISH_API_KEY=sk-tinyfish-your-key-here
GROQ_API_KEY=gsk_your-groq-key-here
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
PORT=3001
```

---

## ▶️ Running the Application

### 🟢 Start the backend

```bash
cd backend
npm run dev
```

👉 http://localhost:3001

---

### ⚛️ Start the frontend

```bash
cd frontend
npm run dev
```

👉 http://localhost:5173

---

## 🔑 API Keys

| 🔑 Key           | 🌍 Source           | 🎯 Purpose         |
| ---------------- | ------------------- | ------------------ |
| TinyFish API Key | tinyfish.ai         | Browser automation |
| Groq API Key     | console.groq.com    | LLM planning       |
| OpenAI API Key   | platform.openai.com | Alternative LLM    |

---

## 🧠 Two Input Modes

### 🟢 Smart Mode

👉 Natural language input

### 🔵 URL Mode

👉 Direct competitor URLs

---

## ⚙️ Settings Panel

🎛️ LLM Settings
🐟 TinyFish API
📊 Max Competitors
🧩 Intel Tasks
👀 Execution Mode

---

## 🧰 Tech Stack

| Layer         | Technology                           |
| ------------- | ------------------------------------ |
| 🎨 Frontend   | React 19, TypeScript, Vite, Tailwind |
| 🟢 Backend    | Node.js, Express                     |
| 🧠 LLM        | Groq, OpenAI, Ollama                 |
| 🌐 Automation | TinyFish API                         |
| ⚡ Streaming   | SSE                                  |
| 💾 Storage    | JSON + localStorage                  |

---

## 📂 Project Structure

```
Lead-Gen/
├── backend/
│   ├── data/ 💾
│   ├── src/
│   │   ├── controllers/ 🎮
│   │   ├── llm/ 🧠
│   │   ├── routes/ 🔗
│   │   ├── services/ ⚙️
│   │   └── server.ts 🚀
├── frontend/
│   ├── components/ 🧩
│   ├── pages/ 📄
│   └── services/ 🔌
├── .env 🔐
└── README.md 📘
```

---

## 💬 Example Prompts

```
Analyze Slack, Notion, and Linear — pricing, jobs, reviews
Compare Figma vs Sketch — features and pricing
What positions is Stripe hiring for
Check reviews for HubSpot on G2
Research Salesforce, HubSpot, and Pipedrive
```

---

## 🏆 Built for Hackathon

🔥 TinyFish Hackathon 2026
⚡ Real-world automation
🚀 Production-ready concept

---

## 📜 License

Built for the TinyFish Hackathon 2026.

---

### 💥 Tagline

> “Stop researching competitors. Let AI do it for you.” 🤖✨

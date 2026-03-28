import {
  BookOpen, Radar, Key, Brain, Cpu, Globe, FileText, Users,
  Database, BarChart3, Zap, Settings, ChevronDown, ArrowRight,
  DollarSign, Briefcase, Star, Share2, Search, Send,
} from "lucide-react";
import { useState } from "react";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function DocSection({ icon, title, color, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors duration-200"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
        <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}12`, color }}>{icon}</span>
        <span className="flex-1 text-left text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
        <ChevronDown size={16} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s" }} />
      </button>
      {open && <div className="px-5 pb-5 pt-1 animate-fade-in">{children}</div>}
    </div>
  );
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}>{num}</span>
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start mt-3 px-3 py-2.5 rounded-xl"
      style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
      <Zap size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{children}</span>
    </div>
  );
}

export function Docs() {
  return (
    <div className="min-h-screen p-6 space-y-4 animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}>
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Documentation</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Learn how to use CompetitorPulse effectively</p>
        </div>
      </div>

      {/* Getting Started */}
      <DocSection icon={<Radar size={16} />} title="Getting Started" color="#6366f1" defaultOpen={true}>
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            CompetitorPulse is an autonomous web agent that gathers competitive intelligence by navigating real websites.
            It uses TinyFish's browser automation to visit competitor sites and extract pricing, job postings, reviews, blog posts, and more.
          </p>
          <div className="space-y-3">
            <Step num={1}>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>Set up your API keys</span>
              <br />Open the settings panel (right sidebar) and enter your TinyFish API key. This is required for the web agent to work.
              Optionally, add an LLM key (Groq, OpenAI, etc.) to enable natural language queries.
            </Step>
            <Step num={2}>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>Choose what to analyze</span>
              <br />Select which intelligence tasks you want (pricing, jobs, reviews, blog, features, social) in the settings panel.
            </Step>
            <Step num={3}>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>Enter competitors</span>
              <br />Type competitor names in the chat (e.g., "Analyze Slack and Notion") or enter URLs directly if you only have a TinyFish key.
            </Step>
            <Step num={4}>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>Watch the agent work</span>
              <br />The live log shows every step the agent takes in real-time. When done, switch to the Intel Reports tab to see structured results.
            </Step>
          </div>
          <Tip>You can stop the agent at any time using the Stop button. Partial results will still be saved.</Tip>
        </div>
      </DocSection>

      {/* API Keys */}
      <DocSection icon={<Key size={16} />} title="API Keys Setup" color="#ef4444">
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Globe size={13} style={{ color: "#0ea5e9" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>TinyFish API Key (Required)</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Powers the web automation agent. Get your key at <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>tinyfish.ai</a>.
              Without this key, the agent cannot navigate websites.
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={13} style={{ color: "#f97316" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>LLM API Key (Optional but recommended)</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Enables natural language queries and smart data extraction. Supports Groq (free tier available), OpenAI, Anthropic, Google, and local Ollama models.
              Without an LLM key, you'll need to enter competitor URLs directly.
            </p>
          </div>
          <Tip>Keys are stored locally in your browser and on the backend. They are never shared with third parties.</Tip>
        </div>
      </DocSection>

      {/* Two Input Modes */}
      <DocSection icon={<Search size={16} />} title="Two Ways to Use the Agent" color="#3b82f6">
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} style={{ color: "#8b5cf6" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Smart Mode (TinyFish + LLM keys)</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Type natural language like "Compare pricing of Slack and Notion" or "What positions is Stripe hiring for".
              The LLM figures out the competitor URLs and plans the analysis automatically.
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Globe size={13} style={{ color: "#0ea5e9" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>URL Mode (TinyFish key only)</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Enter competitor website URLs directly (e.g., https://slack.com, https://notion.so).
              The agent visits each URL and runs the selected intelligence tasks without needing an LLM.
            </p>
          </div>
        </div>
      </DocSection>

      {/* Intelligence Tasks */}
      <DocSection icon={<Cpu size={16} />} title="Intelligence Tasks Explained" color="#06b6d4">
        <div className="space-y-2">
          {[
            { icon: <DollarSign size={13} />, color: "#22c55e", name: "Pricing Pages", desc: "Navigates to the competitor's pricing page, extracts plan names, prices, billing periods, and feature lists. Handles monthly/annual toggles." },
            { icon: <Briefcase size={13} />, color: "#3b82f6", name: "Job Postings", desc: "Finds the careers page and extracts open positions with titles, departments, and locations. Great for understanding what competitors are investing in." },
            { icon: <Star size={13} />, color: "#f59e0b", name: "G2 Reviews", desc: "Searches G2.com for the competitor, extracts overall rating, review count, and recent review snippets. Handles pop-ups and cookie banners." },
            { icon: <FileText size={13} />, color: "#8b5cf6", name: "Blog / News", desc: "Finds the blog or changelog page and extracts recent posts with titles, dates, and summaries. Useful for tracking product announcements." },
            { icon: <Cpu size={13} />, color: "#06b6d4", name: "Features", desc: "Visits the features or product page and extracts key capabilities and feature categories listed on the site." },
            { icon: <Share2 size={13} />, color: "#ec4899", name: "Social Media", desc: "Finds social media links (Twitter, LinkedIn, YouTube, etc.) in the website footer and extracts profile URLs and follower counts." },
          ].map((t) => (
            <div key={t.name} className="flex gap-3 items-start rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${t.color}12`, color: t.color }}>{t.icon}</span>
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      {/* Other Pages */}
      <DocSection icon={<BarChart3 size={16} />} title="App Sections" color="#8b5cf6">
        <div className="space-y-2">
          {[
            { icon: <Zap size={13} />, color: "#6366f1", name: "Agent", desc: "The main page. Enter competitors, watch the agent work in real-time, and view structured intel reports when done." },
            { icon: <FileText size={13} />, color: "#8b5cf6", name: "Forms", desc: "Autonomous form filler. Enter a company name and form type (demo request, contact us, etc.) and the agent finds and fills the form on their website." },
            { icon: <Users size={13} />, color: "#f59e0b", name: "Lead Gen", desc: "Find contacts via LinkedIn searches. Build lead lists with names, companies, roles, and emails. Send cold outreach." },
            { icon: <Database size={13} />, color: "#06b6d4", name: "Intel Data", desc: "All gathered intelligence stored permanently. Browse, search, and delete records. Data persists across sessions." },
            { icon: <BarChart3 size={13} />, color: "#3b82f6", name: "Dashboard", desc: "Visual overview of all your scans — total competitors analyzed, pricing pages found, job postings, reviews, and more." },
          ].map((s) => (
            <div key={s.name} className="flex gap-3 items-start rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${s.color}12`, color: s.color }}>{s.icon}</span>
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      {/* Settings */}
      <DocSection icon={<Settings size={16} />} title="Settings Panel" color="#f59e0b">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            The right sidebar on the Agent page contains all configuration options. Click any icon when the sidebar is collapsed to jump directly to that section.
          </p>
          <div className="space-y-2">
            {[
              { name: "LLM Settings", desc: "Choose your AI provider (Groq, OpenAI, Anthropic, Google, Ollama), select a model, and enter your API key." },
              { name: "TinyFish API", desc: "Enter your TinyFish API key. This powers the browser automation that navigates real websites." },
              { name: "Max Competitors", desc: "Limit how many competitors to analyze per scan (1-10). More competitors = longer scan time." },
              { name: "Intel Tasks", desc: "Toggle which types of intelligence to gather. Disable tasks you don't need to speed up scans." },
              { name: "Execution Mode", desc: "Visible mode shows the browser (useful for demos). Headless mode runs in the background (faster)." },
            ].map((s) => (
              <div key={s.name} className="flex items-start gap-2">
                <ArrowRight size={12} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 4 }} />
                <div>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                  <span className="text-xs ml-1" style={{ color: "var(--text-secondary)" }}>— {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DocSection>

      {/* Example Prompts */}
      <DocSection icon={<Send size={16} />} title="Example Prompts" color="#22c55e">
        <div className="space-y-2">
          {[
            "Compare pricing of Notion and Slack",
            "What positions is Stripe hiring for",
            "Check reviews for HubSpot on G2",
            "Analyze Linear, Jira, and Asana — full breakdown",
            "What features does Figma offer",
            "Research Salesforce, HubSpot, and Pipedrive",
          ].map((p) => (
            <div key={p} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}>
              <Zap size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span className="font-mono text-xs">{p}</span>
            </div>
          ))}
          <Tip>For best results, name specific companies. The LLM resolves company names to URLs automatically.</Tip>
        </div>
      </DocSection>
    </div>
  );
}

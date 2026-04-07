import { useState, useRef, useEffect } from "react";
import {
  Settings, DollarSign, Briefcase, Star, FileText, Cpu, Share2,
  Eye, Lock, Users, Check, ChevronDown, Brain, Key, Server,
} from "lucide-react";

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
}

interface Filters {
  tasks: string[];
  maxCompetitors: number;
  executionMode: "visible" | "headless";
  llm: LLMConfig;
  tinyfishApiKey: string;
}

interface SettingsPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  scrollToSection?: string | null;
  mode?: "all" | "keys-only" | "agent-only";
}

const PROVIDERS: { id: string; label: string; color: string; models: { id: string; label: string }[] }[] = [
  {
    id: "groq", label: "Groq", color: "#f97316",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  {
    id: "openai", label: "OpenAI", color: "#10b981",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
  },
  {
    id: "meta", label: "Meta (Ollama)", color: "#3b82f6",
    models: [
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "llama3", label: "Llama 3" },
      { id: "codellama", label: "Code Llama" },
      { id: "mistral", label: "Mistral" },
      { id: "phi3", label: "Phi-3" },
    ],
  },
  {
    id: "anthropic", label: "Anthropic", color: "#8b5cf6",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    ],
  },
  {
    id: "google", label: "Google", color: "#06b6d4",
    models: [
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.0-pro", label: "Gemini 1.0 Pro" },
    ],
  },
];

const TASK_OPTIONS = [
  { id: "pricing", label: "Pricing Pages", icon: <DollarSign size={14} />, color: "#22c55e" },
  { id: "jobs", label: "Job Postings", icon: <Briefcase size={14} />, color: "#3b82f6" },
  { id: "reviews", label: "G2 Reviews", icon: <Star size={14} />, color: "#f59e0b" },
  { id: "blog", label: "Blog / News", icon: <FileText size={14} />, color: "#8b5cf6" },
  { id: "features", label: "Features", icon: <Cpu size={14} />, color: "#06b6d4" },
  { id: "social", label: "Social Media", icon: <Share2 size={14} />, color: "#ec4899" },
];

/* ── Collapsible Section ── */
function Section({ id, icon, title, color, defaultOpen, scrollToSection, children }: {
  id: string; icon: React.ReactNode; title: string; color: string;
  defaultOpen?: boolean; scrollToSection?: string | null; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-open and scroll when requested from collapsed sidebar icon
  useEffect(() => {
    if (scrollToSection === id) {
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [scrollToSection, id]);

  return (
    <div ref={ref} className="rounded-2xl transition-all duration-300"
      style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: open ? "visible" : "hidden" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 transition-colors duration-200"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
        <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}>{title}</span>
        <ChevronDown size={14} style={{
          color: "var(--text-muted)", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </button>
      <div style={{
        maxHeight: open ? 600 : 0, opacity: open ? 1 : 0, overflow: open ? "visible" : "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
      }}>
        <div className="px-4 pb-4 pt-1">{children}</div>
      </div>
    </div>
  );
}

function Dropdown({ value, onChange, options, accent }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200"
        style={{
          backgroundColor: "var(--bg-input)", border: `1.5px solid ${open ? accent : "var(--border)"}`,
          color: "var(--text-primary)", boxShadow: open ? `0 0 0 3px ${accent}20` : "none",
        }}>
        <span className="flex-1 text-left font-medium text-xs">{selected?.label || value}</span>
        <ChevronDown size={14} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s" }} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden animate-scale-in py-1"
          style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          {options.map((opt) => {
            const isSel = opt.value === value;
            return (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all duration-150"
                style={{ backgroundColor: isSel ? `${accent}12` : "transparent", color: isSel ? accent : "var(--text-primary)" }}
                onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "transparent"; }}>
                {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
                <span className="flex-1 text-left">{opt.label}</span>
                {isSel && <Check size={12} style={{ color: accent }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SettingsPanel({ filters, onChange, scrollToSection, mode = "all" }: SettingsPanelProps) {
  const toggleTask = (taskId: string) => {
    const tasks = filters.tasks.includes(taskId) ? filters.tasks.filter((t) => t !== taskId) : [...filters.tasks, taskId];
    onChange({ ...filters, tasks });
  };

  const pct = (filters.maxCompetitors / 10) * 100;
  const lc = filters.maxCompetitors <= 3 ? "#22c55e" : filters.maxCompetitors <= 6 ? "#f59e0b" : "#ef4444";
  const llm = filters.llm || { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "" };
  const tfKey = filters.tinyfishApiKey || "";
  const [showKey, setShowKey] = useState(false);
  const [showTfKey, setShowTfKey] = useState(false);
  const currentProvider = PROVIDERS.find((p) => p.id === llm.provider) || PROVIDERS[0];

  const updateLLM = (key: keyof LLMConfig, value: string) => {
    const updated = { ...llm, [key]: value };
    if (key === "provider") { const prov = PROVIDERS.find((p) => p.id === value); updated.model = prov?.models[0]?.id || ""; }
    onChange({ ...filters, llm: updated });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff" }}>
          <Settings size={15} />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Configuration</h2>
      </div>

      {/* LLM + TinyFish — shown in "all" and "keys-only" modes */}
      {mode !== "agent-only" && (<>
      <Section id="llm" icon={<Brain size={14} />} title="LLM Settings" color={currentProvider.color} scrollToSection={scrollToSection}>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Provider</div>
            <Dropdown value={llm.provider} onChange={(v) => updateLLM("provider", v)}
              options={PROVIDERS.map((p) => ({ value: p.id, label: p.label, color: p.color }))} accent={currentProvider.color} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Model</div>
            <Dropdown value={llm.model} onChange={(v) => updateLLM("model", v)}
              options={currentProvider.models.map((m) => ({ value: m.id, label: m.label }))} accent={currentProvider.color} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Key size={10} /> API Key
            </div>
            <div className="relative">
              <input type={showKey ? "text" : "password"} value={showKey ? llm.apiKey : llm.apiKey ? "•".repeat(Math.min(llm.apiKey.length, 32)) : ""}
                onChange={(e) => updateLLM("apiKey", e.target.value)}
                onFocus={() => setShowKey(true)} onBlur={() => setShowKey(false)}
                placeholder={`Enter ${currentProvider.label} API key...`}
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none pr-16 font-mono"
                style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {llm.apiKey && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />}
                <button type="button" onClick={() => setShowKey(!showKey)} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}>{showKey ? "Hide" : "Show"}</button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* TinyFish API Key */}
      <Section id="tinyfish" icon={<Server size={14} />} title="TinyFish API" color="#0ea5e9" scrollToSection={scrollToSection}>
        <div className="relative">
          <input type={showTfKey ? "text" : "password"} value={showTfKey ? tfKey : tfKey ? "•".repeat(Math.min(tfKey.length, 32)) : ""}
            onChange={(e) => onChange({ ...filters, tinyfishApiKey: e.target.value })}
            onFocus={() => setShowTfKey(true)} onBlur={() => setShowTfKey(false)}
            placeholder="sk-tinyfish-..."
            className="w-full px-3 py-2.5 rounded-xl text-xs outline-none pr-16 font-mono"
            style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }} />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {tfKey && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />}
            <button type="button" onClick={() => setShowTfKey(!showTfKey)} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}>{showTfKey ? "Hide" : "Show"}</button>
          </div>
        </div>
      </Section>
      </>)}

      {/* Max Competitors — shown in "all" and "agent-only" modes */}
      {mode !== "keys-only" && (<>
      <Section id="competitors" icon={<Users size={14} />} title="Max Competitors" color="#3b82f6" scrollToSection={scrollToSection}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="range" min={1} max={10} value={filters.maxCompetitors}
              onChange={(e) => onChange({ ...filters, maxCompetitors: parseInt(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, ${lc} 0%, ${lc} ${pct}%, var(--bg-hover) ${pct}%, var(--bg-hover) 100%)` }} />
            <div className="flex justify-between mt-1.5 px-0.5">
              {[1, 3, 5, 10].map((n) => (<span key={n} className="text-[10px]" style={{ color: "var(--text-muted)" }}>{n}</span>))}
            </div>
          </div>
          <div className="w-14 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${lc}30, ${lc}15)`, color: lc, border: `1.5px solid ${lc}40` }}>
            {filters.maxCompetitors}
          </div>
        </div>
      </Section>

      {/* Intel Tasks */}
      <Section id="tasks" icon={<Cpu size={14} />} title={`Intel Tasks (${filters.tasks.length})`} color="#06b6d4" scrollToSection={scrollToSection}>
        <div className="space-y-1.5">
          {TASK_OPTIONS.map((task) => {
            const active = filters.tasks.includes(task.id);
            return (
              <button key={task.id} onClick={() => toggleTask(task.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200"
                style={{
                  backgroundColor: active ? `${task.color}12` : "transparent",
                  border: `1.5px solid ${active ? `${task.color}40` : "transparent"}`,
                  color: active ? task.color : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${task.color}15`, color: task.color }}>{task.icon}</span>
                <span className="flex-1 text-left font-medium">{task.label}</span>
                {active && <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: task.color, color: "#fff" }}><Check size={12} /></span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Execution Mode */}
      <Section id="mode" icon={filters.executionMode === "visible" ? <Eye size={14} /> : <Lock size={14} />}
        title="Execution Mode" color="#6366f1" scrollToSection={scrollToSection}>
        <div className="flex gap-2 p-1.5 rounded-2xl" style={{ backgroundColor: "var(--bg-input)" }}>
          {(["visible", "headless"] as const).map((mode) => {
            const active = filters.executionMode === mode;
            const grad = mode === "visible" ? "linear-gradient(135deg, #f43f5e, #ec4899)" : "linear-gradient(135deg, #6366f1, #8b5cf6)";
            const shadow = mode === "visible" ? "rgba(244,63,94,0.3)" : "rgba(99,102,241,0.3)";
            return (
              <button key={mode} onClick={() => onChange({ ...filters, executionMode: mode })}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
                style={{ background: active ? grad : "transparent", color: active ? "#fff" : "var(--text-secondary)", boxShadow: active ? `0 4px 12px ${shadow}` : "none" }}>
                {mode === "visible" ? <Eye size={15} /> : <Lock size={15} />}
                <span>{mode === "visible" ? "Visible" : "Headless"}</span>
              </button>
            );
          })}
        </div>
      </Section>
      </>)}
    </div>
  );
}

export type { Filters };
export { PROVIDERS };

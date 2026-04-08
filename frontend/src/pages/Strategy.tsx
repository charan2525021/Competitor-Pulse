import { useState, useRef, useEffect, useCallback } from "react";
import {
  TrendingUp, Target, Crosshair, Loader2, Send, XCircle,
  DollarSign, ArrowRight, Zap, Globe, ChevronDown, Megaphone, Clock, Trash2,
} from "lucide-react";
import { LiveLogs } from "../components/LiveLogs";
import { startStrategy, createStrategyLogStream, cancelStrategy } from "../services/api";
import type { LogEntry } from "../hooks/useAgentLogs";
import { ScrollReveal } from "../components/ScrollReveal";

function ssGet<T>(key: string, fb: T): T { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function ssSet(key: string, v: unknown) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {} }

const TOOLS = [
  {
    id: "market", label: "Market Breakdown", icon: TrendingUp, color: "#22c55e",
    desc: "TAM/SAM/SOM analysis, trends, underserved opportunities, and where money flows",
    placeholder: "e.g. AI-powered customer support, developer tools, EdTech...",
  },
  {
    id: "distribution", label: "Distribution Plan", icon: Megaphone, color: "#3b82f6",
    desc: "Reach 1M people in 30 days — channels, content formats, daily execution plan",
    placeholder: "e.g. SaaS project management tool for remote teams...",
  },
  {
    id: "weakness", label: "Competitor Weakness Map", icon: Crosshair, color: "#ef4444",
    desc: "Top 5 competitors analyzed — strengths, weaknesses, gaps, domination strategy",
    placeholder: "e.g. email marketing tools, CRM platforms, design tools...",
  },
];

export interface StrategyHistoryItem {
  id: string;
  tool: string;
  input: string;
  timestamp: string;
  status: "running" | "done" | "failed";
  result?: any;
}

interface StrategyProps {
  strategyHistory: StrategyHistoryItem[];
  setStrategyHistory: React.Dispatch<React.SetStateAction<StrategyHistoryItem[]>>;
  onResultReady?: (tool: string, input: string, result: any) => void;
}

export function Strategy({ strategyHistory, setStrategyHistory, onResultReady }: StrategyProps) {
  const [activeTool, setActiveTool] = useState(() => ssGet("strat_tool", "market"));
  const [input, setInput] = useState(() => ssGet("strat_input", ""));
  const [isRunning, setIsRunning] = useState(() => !!ssGet<string | null>("strat_runId", null));
  const [logs, setLogs] = useState<LogEntry[]>(() => ssGet("strat_logs", []));
  const [result, setResult] = useState<any>(() => ssGet("strat_result", null));
  const [showResult, setShowResult] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const runIdRef = useRef<string | null>(ssGet("strat_runId", null));

  // Persist state changes
  useEffect(() => { ssSet("strat_tool", activeTool); }, [activeTool]);
  useEffect(() => { ssSet("strat_input", input); }, [input]);
  useEffect(() => { ssSet("strat_logs", logs); }, [logs]);
  useEffect(() => { ssSet("strat_result", result); }, [result]);

  const currentHistoryIdRef = useRef<string | null>(null);

  const connectStream = useCallback((runId: string) => {
    esRef.current?.close();
    const es = createStrategyLogStream(runId,
      (msg) => setLogs((p) => { const updated = [...p, { ...msg, timestamp: new Date().toISOString() }]; return updated; }),
      (res) => {
        setIsRunning(false);
        ssSet("strat_runId", null);
        if (res) {
          setResult(res);
          setShowResult(true);
          // Update history status
          if (currentHistoryIdRef.current) {
            setStrategyHistory((prev) => prev.map((h) => h.id === currentHistoryIdRef.current ? { ...h, status: "done" as const, result: res } : h));
          }
          // Push to intel
          onResultReady?.(activeTool, input, res);
        } else {
          if (currentHistoryIdRef.current) {
            setStrategyHistory((prev) => prev.map((h) => h.id === currentHistoryIdRef.current ? { ...h, status: "failed" as const } : h));
          }
        }
      }
    );
    esRef.current = es;
  }, [activeTool, input, onResultReady, setStrategyHistory]);

  // Reconnect to an active run on mount (handles refresh / tab switch)
  useEffect(() => {
    const savedRunId = ssGet<string | null>("strat_runId", null);
    if (savedRunId) {
      runIdRef.current = savedRunId;
      setIsRunning(true);
      connectStream(savedRunId);
    }
    return () => { esRef.current?.close(); };
  }, [connectStream]);

  const tool = TOOLS.find((t) => t.id === activeTool) || TOOLS[0];
  const Icon = tool.icon;

  const handleRun = async () => {
    if (!input.trim()) return;
    setIsRunning(true);
    setLogs([]);
    setResult(null);
    setShowResult(false);

    const historyId = crypto.randomUUID();
    currentHistoryIdRef.current = historyId;
    setStrategyHistory((prev) => [{ id: historyId, tool: activeTool, input: input.trim(), timestamp: new Date().toISOString(), status: "running" as const }, ...prev]);

    try {
      // Read config from localStorage for API keys
      let llm, tfKey;
      try {
        const cfg = JSON.parse(localStorage.getItem("cp_filters") || "{}");
        llm = cfg.llm;
        tfKey = cfg.tinyfishApiKey;
      } catch {}

      const data = await startStrategy(activeTool, input.trim(), llm, tfKey);
      if (!data.success) { setIsRunning(false); ssSet("strat_runId", null); return; }
      runIdRef.current = data.runId;
      ssSet("strat_runId", data.runId);

      connectStream(data.runId);
    } catch { setIsRunning(false); ssSet("strat_runId", null); }
  };

  const handleCancel = async () => {
    if (runIdRef.current) await cancelStrategy(runIdRef.current).catch(() => {});
    esRef.current?.close();
    setIsRunning(false);
    runIdRef.current = null;
    ssSet("strat_runId", null);
  };

  return (
    <div className="min-h-screen p-6 space-y-5 page-enter" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff" }}>
          <Target size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Strategy Tools</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI-powered market analysis with real web research</p>
        </div>
      </div>

      {/* Strategy History */}
      {strategyHistory.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}><Clock size={13} /></span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Analysis History</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {strategyHistory.map((h) => {
              const t = TOOLS.find((t) => t.id === h.tool);
              const dotColor = h.status === "running" ? "#eab308" : h.status === "done" ? "#22c55e" : "#ef4444";
              return (
                <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 group cursor-pointer"
                  style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}
                  onClick={() => { if (h.result) { setResult(h.result); setShowResult(true); setActiveTool(h.tool); setInput(h.input); } }}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${h.status === "running" ? "animate-pulse-dot" : ""}`} style={{ backgroundColor: dotColor }} />
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${t?.color || "#ef4444"}15`, color: t?.color || "#ef4444" }}>{t?.label || h.tool}</span>
                  <span className="font-medium truncate max-w-[160px]" style={{ color: "var(--text-primary)" }} title={h.input}>{h.input}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{new Date(h.timestamp).toLocaleDateString()}</span>
                  <button onClick={(e) => { e.stopPropagation(); setStrategyHistory((prev) => prev.filter((x) => x.id !== h.id)); }}
                    className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110" style={{ color: "#ef4444" }}><Trash2 size={10} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool Selector */}
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map((t, i) => {
          const TIcon = t.icon;
          const active = activeTool === t.id;
          return (
            <ScrollReveal key={t.id} animation="scroll-scale-up" delay={i * 80}>
            <button onClick={() => { setActiveTool(t.id); setResult(null); setShowResult(false); }}
              className="p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] w-full"
              style={{
                backgroundColor: active ? `${t.color}10` : "var(--bg-card)",
                border: `1.5px solid ${active ? t.color : "var(--border)"}`,
                boxShadow: active ? `0 2px 12px ${t.color}20` : "var(--shadow-sm)",
              }}>
              <TIcon size={20} style={{ color: t.color, marginBottom: 8 }} />
              <div className="text-sm font-semibold" style={{ color: active ? t.color : "var(--text-primary)" }}>{t.label}</div>
              <div className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{t.desc}</div>
            </button>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Input */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Icon size={16} style={{ color: tool.color }} />
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{tool.label}</span>
        </div>
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isRunning) handleRun(); }}
            placeholder={tool.placeholder} disabled={isRunning}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = tool.color)}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          <button onClick={handleRun} disabled={isRunning || !input.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 shrink-0 transition-all"
            style={{ background: `linear-gradient(135deg, ${tool.color}, ${tool.color}dd)`, opacity: !input.trim() ? 0.4 : 1 }}>
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {isRunning ? "Analyzing..." : "Analyze"}
          </button>
          {isRunning && (
            <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <XCircle size={14} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Toggle logs/results */}
      {result && !isRunning && (
        <div className="flex gap-2 p-1 rounded-xl self-start" style={{ backgroundColor: "var(--bg-input)" }}>
          <button onClick={() => setShowResult(false)} className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: !showResult ? `linear-gradient(135deg, ${tool.color}, ${tool.color}dd)` : "transparent", color: !showResult ? "#fff" : "var(--text-secondary)" }}>
            Live Logs
          </button>
          <button onClick={() => setShowResult(true)} className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: showResult ? `linear-gradient(135deg, ${tool.color}, ${tool.color}dd)` : "transparent", color: showResult ? "#fff" : "var(--text-secondary)" }}>
            Analysis Results
          </button>
        </div>
      )}

      {/* Results */}
      {showResult && result ? (
        <div className="rounded-2xl p-5 space-y-4 animate-fade-in" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)" }}>
          {result.title && <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{result.title}</h2>}
          {result.summary && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{result.summary}</p>}

          {/* Market Breakdown */}
          {result.tam && (
            <div className="grid grid-cols-3 gap-3">
              {[{ label: "TAM", ...result.tam }, { label: "SAM", ...result.sam }, { label: "SOM", ...result.som }].map((m) => (
                <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{m.label}</div>
                  <div className="text-xl font-bold mt-1" style={{ color: "#22c55e" }}>{m.value}</div>
                  <div className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{m.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Trends */}
          {result.trends && (
            <Section title="Market Trends" color="#3b82f6">
              {result.trends.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                  <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ backgroundColor: t.impact === "High" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", color: t.impact === "High" ? "#ef4444" : "#3b82f6" }}>
                    {t.impact}
                  </span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.trend}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{t.description}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Opportunities */}
          {result.opportunities && (
            <Section title="Underserved Opportunities" color="#22c55e">
              {result.opportunities.map((o: any, i: number) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                  <Zap size={14} style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{o.opportunity}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{o.description}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Money Flow */}
          {result.moneyFlow && (
            <Section title="Where Money is Flowing" color="#f59e0b">
              {result.moneyFlow.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{m.area}</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{m.evidence}</div>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: "#f59e0b" }}>{m.amount}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Distribution Channels */}
          {result.channels && (
            <Section title="Acquisition Channels" color="#3b82f6">
              {result.channels.map((c: any, i: number) => (
                <div key={i} className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                  <div className="flex items-center gap-2">
                    <Globe size={13} style={{ color: "#3b82f6" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.channel}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c.type === "paid" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: c.type === "paid" ? "#ef4444" : "#22c55e" }}>{c.type}</span>
                    <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{c.reach}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{c.strategy}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Viral Hooks */}
          {result.viralHooks && (
            <Section title="Viral Content Hooks" color="#ec4899">
              <div className="space-y-1">
                {result.viralHooks.map((h: string, i: number) => (
                  <div key={i} className="text-sm px-3 py-2 rounded-xl flex items-start gap-2" style={{ backgroundColor: "var(--bg-input)" }}>
                    <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: "#ec4899" }}>#{i + 1}</span>
                    <span style={{ color: "var(--text-primary)" }}>{h}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Daily Plan */}
          {result.dailyPlan && (
            <Section title="30-Day Execution Plan" color="#8b5cf6">
              {result.dailyPlan.map((d: any, i: number) => (
                <div key={i} className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff" }}>{d.day}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{d.goal}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {d.tasks?.map((t: string, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6" }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Competitors */}
          {result.competitors && (
            <Section title="Competitor Analysis" color="#ef4444">
              {result.competitors.map((c: any, i: number) => (
                <CompetitorRow key={i} comp={c} />
              ))}
            </Section>
          )}

          {/* Positioning Gaps */}
          {result.positioningGaps && (
            <Section title="Positioning Gaps" color="#f59e0b">
              {result.positioningGaps.map((g: any, i: number) => (
                <div key={i} className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                  <div className="flex items-center gap-2">
                    <Target size={13} style={{ color: "#f59e0b" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{g.gap}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded ml-auto" style={{ backgroundColor: g.difficulty === "Easy" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: g.difficulty === "Easy" ? "#22c55e" : "#f59e0b" }}>{g.difficulty}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{g.opportunity}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Domination Strategy */}
          {result.dominationStrategy && (
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(245,158,11,0.05))", border: "1.5px solid rgba(239,68,68,0.2)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#ef4444" }}>Domination Strategy</div>
              {Object.entries(result.dominationStrategy).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 mb-2">
                  <ArrowRight size={12} style={{ color: "#ef4444", flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <span className="text-xs font-medium capitalize" style={{ color: "var(--text-primary)" }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{v as string}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        (logs.length > 0 || isRunning) && (
          <div style={{ height: 350, minHeight: 350 }} className="flex">
            <LiveLogs logs={logs} isRunning={isRunning} />
          </div>
        )
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CompetitorRow({ comp }: { comp: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl" style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={() => setOpen(!open)}>
        <Crosshair size={13} style={{ color: "#ef4444" }} />
        <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{comp.name}</span>
        <ChevronDown size={13} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          <div>
            <div className="text-[9px] font-semibold uppercase" style={{ color: "#22c55e" }}>Strengths</div>
            <div className="flex flex-wrap gap-1 mt-1">{comp.strengths?.map((s: string, i: number) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#22c55e" }}>{s}</span>
            ))}</div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase" style={{ color: "#ef4444" }}>Weaknesses</div>
            <div className="flex flex-wrap gap-1 mt-1">{comp.weaknesses?.map((w: string, i: number) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}>{w}</span>
            ))}</div>
          </div>
          {comp.ignoredAudience && <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Ignored audience: {comp.ignoredAudience}</div>}
          {comp.pricingGap && <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Pricing gap: {comp.pricingGap}</div>}
        </div>
      )}
    </div>
  );
}

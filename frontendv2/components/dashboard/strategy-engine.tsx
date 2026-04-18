"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { LiveLogs } from "@/components/live-logs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/scroll-reveal"
import { 
  Target, 
  TrendingUp,
  Megaphone,
  Crosshair,
  Square,
  Loader2,
  Sparkles,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  ArrowRight,
} from "lucide-react"
import { startStrategy, createStrategyLogStream, cancelStrategy } from "@/lib/api"

interface LogEntry {
  id: string
  type: string
  message: string
  timestamp: string
}

function ssGet<T>(key: string, fb: T): T { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function ssSet(key: string, v: unknown) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {} }

const TOOLS = [
  {
    id: "market", label: "Market Breakdown", icon: TrendingUp, color: "#22c55e",
    desc: "TAM/SAM/SOM analysis, trends, underserved opportunities",
    placeholder: "e.g. AI-powered customer support, developer tools...",
  },
  {
    id: "distribution", label: "Distribution Plan", icon: Megaphone, color: "#3b82f6",
    desc: "Reach 1M people in 30 days — channels, content, execution",
    placeholder: "e.g. SaaS project management tool for remote teams...",
  },
  {
    id: "weakness", label: "Competitor Weakness Map", icon: Crosshair, color: "#ef4444",
    desc: "Top 5 competitors — strengths, weaknesses, gaps, domination strategy",
    placeholder: "e.g. email marketing tools, CRM platforms...",
  },
]

export interface StrategyHistoryItem {
  id: string
  tool: string
  input: string
  timestamp: string
  status: "running" | "done" | "failed"
  result?: any
}

interface StrategyProps {
  strategyHistory?: StrategyHistoryItem[]
  setStrategyHistory?: React.Dispatch<React.SetStateAction<StrategyHistoryItem[]>>
}

export function StrategyEngine({ strategyHistory: externalHistory, setStrategyHistory: externalSetHistory }: StrategyProps) {
  const [internalHistory, setInternalHistory] = useState<StrategyHistoryItem[]>([])
  const strategyHistory = externalHistory ?? internalHistory
  const setStrategyHistory = externalSetHistory ?? setInternalHistory

  const [activeTool, setActiveTool] = useState(() => ssGet("strat_tool", "market"))
  const [input, setInput] = useState(() => ssGet("strat_input", ""))
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>(() => ssGet("strat_logs", []))
  const [result, setResult] = useState<any>(() => ssGet("strat_result", null))
  const [showResult, setShowResult] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const runIdRef = useRef<string | null>(ssGet("strat_runId", null))

  // Load strategy history from backend on mount (only if no external history provided)
  useEffect(() => {
    if (externalHistory) return
    async function loadHistory() {
      try {
        const res = await fetch("/api/store/strategyHistory")
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          setInternalHistory(data.data.map((r: any) => ({
            id: r.id,
            tool: r.tool || "market",
            input: r.input || "",
            timestamp: r.timestamp || new Date().toISOString(),
            status: r.status === "complete" || r.status === "done" ? "done" as const
              : r.status === "error" || r.status === "failed" ? "failed" as const
              : "done" as const,
            result: r.result,
          })))
        }
      } catch {}
    }
    loadHistory()
  }, [externalHistory])

  useEffect(() => { ssSet("strat_tool", activeTool) }, [activeTool])
  useEffect(() => { ssSet("strat_input", input) }, [input])
  useEffect(() => { ssSet("strat_logs", logs) }, [logs])
  useEffect(() => { ssSet("strat_result", result) }, [result])

  // Refresh history from backend when a run finishes
  const prevRunningRef = useRef(false)
  useEffect(() => {
    if (prevRunningRef.current && !isRunning && !externalHistory) {
      // Run just finished — reload history
      fetch("/api/store/strategyHistory")
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setInternalHistory(data.data.map((r: any) => ({
              id: r.id,
              tool: r.tool || "market",
              input: r.input || "",
              timestamp: r.timestamp || new Date().toISOString(),
              status: r.status === "complete" || r.status === "done" ? "done" as const
                : r.status === "error" || r.status === "failed" ? "failed" as const
                : "done" as const,
              result: r.result,
            })))
          }
        })
        .catch(() => {})
    }
    prevRunningRef.current = isRunning
  }, [isRunning, externalHistory])

  const connectStream = useCallback((runId: string) => {
    esRef.current?.close()
    const es = createStrategyLogStream(runId,
      (msg) => setLogs(p => [...p, { ...msg, id: `s-${Date.now()}-${Math.random()}`, timestamp: new Date().toISOString() }]),
      (res) => {
        setIsRunning(false)
        ssSet("strat_runId", null)
        if (res) {
          setResult(res)
          setShowResult(true)
        }
      }
    )
    esRef.current = es
  }, [])

  // Reconnect on mount if a run was active
  useEffect(() => {
    const savedRunId = ssGet<string | null>("strat_runId", null)
    if (savedRunId) {
      runIdRef.current = savedRunId
      setIsRunning(true)
      connectStream(savedRunId)
    }
    return () => { esRef.current?.close() }
  }, [connectStream])

  const tool = TOOLS.find(t => t.id === activeTool) || TOOLS[0]

  const handleRun = async () => {
    if (!input.trim()) return
    setIsRunning(true)
    setLogs([])
    setResult(null)
    setShowResult(false)

    let llm, tfKey
    try { const cfg = JSON.parse(localStorage.getItem("cp_filters") || "{}"); llm = cfg.llm; tfKey = cfg.tinyfishApiKey; } catch {}

    try {
      const data = await startStrategy(activeTool, input.trim(), llm, tfKey)
      if (!data.success) { setIsRunning(false); ssSet("strat_runId", null); return }
      runIdRef.current = data.runId
      ssSet("strat_runId", data.runId)
      connectStream(data.runId)
    } catch {
      setIsRunning(false)
      ssSet("strat_runId", null)
    }
  }

  const handleCancel = async () => {
    if (runIdRef.current) await cancelStrategy(runIdRef.current).catch(() => {})
    esRef.current?.close()
    setIsRunning(false)
    runIdRef.current = null
    ssSet("strat_runId", null)
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff" }}>
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strategy Tools</h1>
          <p className="text-sm text-muted-foreground">AI-powered market analysis with real web research</p>
        </div>
      </div>

      {/* Collapsible Strategy History */}
      <Card>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Analysis History</span>
            {strategyHistory.length > 0 && (
              <Badge variant="secondary" className="text-xs">{strategyHistory.length}</Badge>
            )}
          </div>
          {historyExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {historyExpanded && (
          <CardContent className="pt-0 pb-4">
            {strategyHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No analysis history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strategyHistory.map((h) => {
                  const isOpen = expandedHistoryId === h.id
                  const t = TOOLS.find(t => t.id === h.tool)
                  const r = h.result
                  return (
                    <div key={h.id} className="rounded-lg border bg-card overflow-hidden">
                      <button
                        onClick={() => setExpandedHistoryId(isOpen ? null : h.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0",
                          h.status === "running" ? "bg-amber-500 animate-pulse" : h.status === "done" ? "bg-emerald-500" : "bg-rose-500")} />
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{t?.label || h.tool}</Badge>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-sm truncate">{h.input}</p>
                          <p className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</p>
                        </div>
                        {setStrategyHistory && (
                          <span onClick={(e) => { e.stopPropagation(); setStrategyHistory(prev => prev.filter(x => x.id !== h.id)) }}
                            className="text-rose-500 hover:scale-110 transition-all shrink-0"><Trash2 className="h-3.5 w-3.5" /></span>
                        )}
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      {isOpen && r && (
                        <div className="px-3 pb-4 space-y-4">
                          {r.title && <h3 className="text-sm font-bold px-1">{r.title}</h3>}
                          {r.summary && <p className="text-xs text-muted-foreground px-1">{r.summary}</p>}

                          {/* TAM / SAM / SOM */}
                          {r.tam && (
                            <div className="grid grid-cols-3 gap-2">
                              {[{ label: "TAM", ...r.tam }, { label: "SAM", ...r.sam }, { label: "SOM", ...r.som }].map((m) => (
                                <div key={m.label} className="rounded-xl p-3 bg-muted border">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                                  <div className="text-lg font-bold mt-1 text-emerald-500">{m.value}</div>
                                  <div className="text-[11px] mt-1 text-muted-foreground">{m.description}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Trends */}
                          {r.trends?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-blue-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market Trends</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.trends.map((t: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-xl bg-muted">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                                      style={{ backgroundColor: t.impact === "High" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", color: t.impact === "High" ? "#ef4444" : "#3b82f6" }}>
                                      {t.impact}
                                    </span>
                                    <div>
                                      <span className="text-sm font-medium">{t.trend}</span>
                                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Opportunities */}
                          {r.opportunities?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Underserved Opportunities</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.opportunities.map((o: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted">
                                    <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-sm font-medium">{o.opportunity}</span>
                                      {o.description && <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Money Flow */}
                          {r.moneyFlow?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-amber-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where Money is Flowing</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.moneyFlow.map((m: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted">
                                    <div>
                                      <span className="text-sm font-medium">{m.area}</span>
                                      {m.evidence && <p className="text-xs text-muted-foreground">{m.evidence}</p>}
                                    </div>
                                    <span className="text-sm font-bold text-amber-500 shrink-0">{m.amount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Channels */}
                          {r.channels?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-blue-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acquisition Channels</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.channels.map((c: any, i: number) => (
                                  <div key={i} className="px-3 py-2 rounded-xl bg-muted">
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                                      <span className="text-sm font-medium">{c.channel}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: c.type === "paid" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: c.type === "paid" ? "#ef4444" : "#22c55e" }}>
                                        {c.type}
                                      </span>
                                      <span className="ml-auto text-xs text-muted-foreground">{c.reach}</span>
                                    </div>
                                    {c.strategy && <p className="text-xs mt-1 text-muted-foreground">{c.strategy}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Viral Hooks */}
                          {r.viralHooks?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-pink-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Viral Content Hooks</span>
                              </div>
                              <div className="space-y-1">
                                {r.viralHooks.map((hook: string, i: number) => (
                                  <div key={i} className="text-sm px-3 py-2 rounded-xl flex items-start gap-2 bg-muted">
                                    <span className="text-xs font-bold text-pink-500 shrink-0 mt-0.5">#{i + 1}</span>
                                    <span>{hook}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Daily Plan */}
                          {r.dailyPlan?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-violet-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">30-Day Execution Plan</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.dailyPlan.map((d: any, i: number) => (
                                  <div key={i} className="px-3 py-2 rounded-xl bg-muted">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>{d.day}</span>
                                      <span className="text-xs text-muted-foreground">{d.goal}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {d.tasks?.map((task: string, j: number) => (
                                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">{task}</span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Competitors */}
                          {r.competitors?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-rose-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competitor Analysis</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.competitors.map((c: any, ci: number) => (
                                  <div key={ci} className="rounded-xl bg-muted border overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2">
                                      <Crosshair className="h-3 w-3 text-rose-500 shrink-0" />
                                      <span className="text-sm font-medium flex-1">{c.name}</span>
                                    </div>
                                    <div className="px-3 pb-2 space-y-1.5">
                                      {c.strengths?.length > 0 && (
                                        <div>
                                          <div className="text-[9px] font-semibold uppercase text-emerald-500 mb-1">Strengths</div>
                                          <div className="flex flex-wrap gap-1">{c.strengths.map((s: string, si: number) => (
                                            <span key={si} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">{s}</span>
                                          ))}</div>
                                        </div>
                                      )}
                                      {c.weaknesses?.length > 0 && (
                                        <div>
                                          <div className="text-[9px] font-semibold uppercase text-rose-500 mb-1">Weaknesses</div>
                                          <div className="flex flex-wrap gap-1">{c.weaknesses.map((w: string, wi: number) => (
                                            <span key={wi} className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500">{w}</span>
                                          ))}</div>
                                        </div>
                                      )}
                                      {c.ignoredAudience && <div className="text-xs text-muted-foreground">Ignored audience: {c.ignoredAudience}</div>}
                                      {c.pricingGap && <div className="text-xs text-muted-foreground">Pricing gap: {c.pricingGap}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Positioning Gaps */}
                          {r.positioningGaps?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 rounded-full bg-amber-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Positioning Gaps</span>
                              </div>
                              <div className="space-y-1.5">
                                {r.positioningGaps.map((g: any, gi: number) => (
                                  <div key={gi} className="px-3 py-2 rounded-xl bg-muted">
                                    <div className="flex items-center gap-2">
                                      <Target className="h-3 w-3 text-amber-500 shrink-0" />
                                      <span className="text-sm font-medium">{g.gap}</span>
                                      {g.difficulty && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded ml-auto"
                                          style={{ backgroundColor: g.difficulty === "Easy" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: g.difficulty === "Easy" ? "#22c55e" : "#f59e0b" }}>
                                          {g.difficulty}
                                        </span>
                                      )}
                                    </div>
                                    {g.opportunity && <p className="text-xs mt-1 text-muted-foreground">{g.opportunity}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Domination Strategy */}
                          {r.dominationStrategy && (
                            <div className="rounded-xl p-4"
                              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(245,158,11,0.05))", border: "1.5px solid rgba(239,68,68,0.2)" }}>
                              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-rose-500">Domination Strategy</div>
                              {Object.entries(r.dominationStrategy).map(([k, v]) => (
                                <div key={k} className="flex items-start gap-2 mb-1.5">
                                  <ArrowRight className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-xs font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                                    <span className="text-xs text-muted-foreground">{v as string}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Fallback for unstructured result */}
                          {typeof r === "string" && <p className="text-sm whitespace-pre-wrap">{r}</p>}
                        </div>
                      )}

                      {isOpen && !r && (
                        <div className="px-3 pb-3 text-center py-4 text-muted-foreground text-xs">
                          No result data available for this analysis
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Tool Selector */}
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map((t) => {
          const TIcon = t.icon
          const active = activeTool === t.id
          return (
            <ScrollReveal key={t.id} delay={100}>
              <button onClick={() => { setActiveTool(t.id); setResult(null); setShowResult(false) }}
                className={cn(
                  "p-4 rounded-xl text-left transition-all w-full border",
                  active ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "border-border hover:border-muted-foreground/30"
                )}>
                <TIcon className="h-5 w-5 mb-2" style={{ color: t.color }} />
                <h3 className="font-semibold text-sm">{t.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </button>
            </ScrollReveal>
          )
        })}
      </div>

      {/* Input + Run */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input
              placeholder={tool.placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isRunning}
              onKeyDown={e => e.key === "Enter" && !isRunning && handleRun()}
              className="flex-1"
            />
            {isRunning ? (
              <Button variant="destructive" onClick={handleCancel}>
                <Square className="mr-2 h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button onClick={handleRun} disabled={!input.trim()}>
                <Sparkles className="mr-2 h-4 w-4" /> Analyze
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Logs */}
      {(isRunning || logs.length > 0) && (
        <LiveLogs
          logs={logs}
          isRunning={isRunning}
          title="strategy-engine"
          maxHeight="250px"
        />
      )}

      {/* Result */}
      {showResult && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.title && <h2 className="text-lg font-bold">{result.title}</h2>}
            {result.summary && <p className="text-sm text-muted-foreground">{result.summary}</p>}

            {/* TAM / SAM / SOM */}
            {result.tam && (
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "TAM", ...result.tam }, { label: "SAM", ...result.sam }, { label: "SOM", ...result.som }].map((m) => (
                  <div key={m.label} className="rounded-xl p-4 bg-muted border">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                    <div className="text-xl font-bold mt-1 text-emerald-500">{m.value}</div>
                    <div className="text-[11px] mt-1 text-muted-foreground">{m.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Trends */}
            {result.trends?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market Trends</span>
                </div>
                <div className="space-y-2">
                  {result.trends.map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted">
                      <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                        style={{ backgroundColor: t.impact === "High" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", color: t.impact === "High" ? "#ef4444" : "#3b82f6" }}>
                        {t.impact}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{t.trend}</div>
                        {t.description && <div className="text-xs mt-0.5 text-muted-foreground">{t.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {result.opportunities?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Underserved Opportunities</span>
                </div>
                <div className="space-y-2">
                  {result.opportunities.map((o: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted">
                      <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">{o.opportunity}</div>
                        {o.description && <div className="text-xs mt-0.5 text-muted-foreground">{o.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Money Flow */}
            {result.moneyFlow?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where Money is Flowing</span>
                </div>
                <div className="space-y-2">
                  {result.moneyFlow.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted">
                      <div>
                        <div className="text-sm font-medium">{m.area}</div>
                        {m.evidence && <div className="text-xs text-muted-foreground">{m.evidence}</div>}
                      </div>
                      <span className="text-sm font-bold shrink-0 text-amber-500">{m.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channels */}
            {result.channels?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acquisition Channels</span>
                </div>
                <div className="space-y-2">
                  {result.channels.map((c: any, i: number) => (
                    <div key={i} className="px-3 py-2.5 rounded-xl bg-muted">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-blue-500" />
                        <span className="text-sm font-medium">{c.channel}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: c.type === "paid" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: c.type === "paid" ? "#ef4444" : "#22c55e" }}>
                          {c.type}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">{c.reach}</span>
                      </div>
                      {c.strategy && <div className="text-xs mt-1 text-muted-foreground">{c.strategy}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Viral Hooks */}
            {result.viralHooks?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-pink-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Viral Content Hooks</span>
                </div>
                <div className="space-y-1">
                  {result.viralHooks.map((hook: string, i: number) => (
                    <div key={i} className="text-sm px-3 py-2 rounded-xl flex items-start gap-2 bg-muted">
                      <span className="text-xs font-bold shrink-0 mt-0.5 text-pink-500">#{i + 1}</span>
                      <span>{hook}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Plan */}
            {result.dailyPlan?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-violet-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">30-Day Execution Plan</span>
                </div>
                <div className="space-y-2">
                  {result.dailyPlan.map((d: any, i: number) => (
                    <div key={i} className="px-3 py-2.5 rounded-xl bg-muted">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>{d.day}</span>
                        <span className="text-xs text-muted-foreground">{d.goal}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {d.tasks?.map((t: string, j: number) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitors */}
            {result.competitors?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competitor Analysis</span>
                </div>
                <div className="space-y-2">
                  {result.competitors.map((c: any, ci: number) => (
                    <div key={ci} className="rounded-xl bg-muted border overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <Crosshair className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="text-sm font-medium flex-1">{c.name}</span>
                      </div>
                      <div className="px-3 pb-2.5 space-y-2">
                        {c.strengths?.length > 0 && (
                          <div>
                            <div className="text-[9px] font-semibold uppercase text-emerald-500 mb-1">Strengths</div>
                            <div className="flex flex-wrap gap-1">{c.strengths.map((s: string, si: number) => (
                              <span key={si} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">{s}</span>
                            ))}</div>
                          </div>
                        )}
                        {c.weaknesses?.length > 0 && (
                          <div>
                            <div className="text-[9px] font-semibold uppercase text-rose-500 mb-1">Weaknesses</div>
                            <div className="flex flex-wrap gap-1">{c.weaknesses.map((w: string, wi: number) => (
                              <span key={wi} className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500">{w}</span>
                            ))}</div>
                          </div>
                        )}
                        {c.ignoredAudience && <div className="text-xs text-muted-foreground">Ignored audience: {c.ignoredAudience}</div>}
                        {c.pricingGap && <div className="text-xs text-muted-foreground">Pricing gap: {c.pricingGap}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Positioning Gaps */}
            {result.positioningGaps?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Positioning Gaps</span>
                </div>
                <div className="space-y-2">
                  {result.positioningGaps.map((g: any, gi: number) => (
                    <div key={gi} className="px-3 py-2.5 rounded-xl bg-muted">
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium">{g.gap}</span>
                        {g.difficulty && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded ml-auto"
                            style={{ backgroundColor: g.difficulty === "Easy" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: g.difficulty === "Easy" ? "#22c55e" : "#f59e0b" }}>
                            {g.difficulty}
                          </span>
                        )}
                      </div>
                      {g.opportunity && <div className="text-xs mt-1 text-muted-foreground">{g.opportunity}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domination Strategy */}
            {result.dominationStrategy && (
              <div className="rounded-xl p-4"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(245,158,11,0.05))", border: "1.5px solid rgba(239,68,68,0.2)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-rose-500">Domination Strategy</div>
                {Object.entries(result.dominationStrategy).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 mb-2">
                    <ArrowRight className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                      <span className="text-xs text-muted-foreground">{v as string}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback for unstructured/string result */}
            {typeof result === "string" && (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">{result}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

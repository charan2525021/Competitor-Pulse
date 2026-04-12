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

export function StrategyEngine({ strategyHistory = [], setStrategyHistory }: StrategyProps) {
  const [activeTool, setActiveTool] = useState(() => ssGet("strat_tool", "market"))
  const [input, setInput] = useState(() => ssGet("strat_input", ""))
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>(() => ssGet("strat_logs", []))
  const [result, setResult] = useState<any>(() => ssGet("strat_result", null))
  const [showResult, setShowResult] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const runIdRef = useRef<string | null>(ssGet("strat_runId", null))

  useEffect(() => { ssSet("strat_tool", activeTool) }, [activeTool])
  useEffect(() => { ssSet("strat_input", input) }, [input])
  useEffect(() => { ssSet("strat_logs", logs) }, [logs])
  useEffect(() => { ssSet("strat_result", result) }, [result])

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

      {/* Strategy History */}
      {strategyHistory.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analysis History</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {strategyHistory.map((h) => {
                const t = TOOLS.find(t => t.id === h.tool)
                return (
                  <button key={h.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs group bg-muted border border-border hover:border-primary/30 transition-all"
                    onClick={() => { if (h.result) { setResult(h.result); setShowResult(true); setActiveTool(h.tool); setInput(h.input) } }}>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", h.status === "running" ? "bg-amber-500 animate-pulse" : h.status === "done" ? "bg-emerald-500" : "bg-rose-500")} />
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t?.label || h.tool}</Badge>
                    <span className="font-medium truncate max-w-[140px]">{h.input}</span>
                    {setStrategyHistory && (
                      <span onClick={(e) => { e.stopPropagation(); setStrategyHistory(prev => prev.filter(x => x.id !== h.id)) }}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:scale-110 transition-all"><Trash2 className="h-3 w-3" /></span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

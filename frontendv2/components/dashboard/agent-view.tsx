"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Bot, 
  Play, 
  Square, 
  RefreshCw,
  Globe,
  CheckCircle2,
  Clock,
  Zap,
  DollarSign,
  Star,
  Briefcase,
  Newspaper,
  Layers,
  Share2,
  Loader2,
  Minus,
  Plus,
} from "lucide-react"
import { startAgent, createLogStream, cancelAgent, fetchRunReports } from "@/lib/api"
import { LiveLogs } from "@/components/live-logs"

interface AgentLog {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error" | "action"
  message: string
}

type AgentPhase = "idle" | "scanning" | "running" | "done"

const ACTIVE_AGENT_RUN_KEY = "cp_active_agent_run"

const SCAN_STEPS = [
  { text: "Connecting to AI engine...", pct: 10 },
  { text: "Analyzing market position...", pct: 25 },
  { text: "Identifying competitor landscape...", pct: 45 },
  { text: "Mapping industry verticals...", pct: 65 },
  { text: "Preparing browser agent...", pct: 85 },
  { text: "Agent ready — launching scan...", pct: 100 },
]

const DIMENSION_OPTIONS = [
  { id: "all", label: "All", icon: Layers, color: "text-primary bg-primary/10 border-primary/30" },
  { id: "pricing", label: "Price", icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { id: "reviews", label: "Review", icon: Star, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { id: "jobs", label: "Job", icon: Briefcase, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { id: "blog", label: "Blog / News", icon: Newspaper, color: "text-violet-500 bg-violet-500/10 border-violet-500/30" },
  { id: "features", label: "Features", icon: Zap, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" },
  { id: "social", label: "Social Media", icon: Share2, color: "text-pink-500 bg-pink-500/10 border-pink-500/30" },
] as const

export function AgentView() {
  const [url, setUrl] = React.useState("")
  const [phase, setPhase] = React.useState<AgentPhase>("idle")
  const [logs, setLogs] = React.useState<AgentLog[]>([])
  const [runId, setRunId] = React.useState<string | null>(null)
  const [selectedDimensions, setSelectedDimensions] = React.useState<string[]>(["all"])
  const [maxCompetitors, setMaxCompetitors] = React.useState(5)
  const [scanProgress, setScanProgress] = React.useState(0)
  const [scanText, setScanText] = React.useState("")
  const esRef = React.useRef<EventSource | null>(null)
  const scanTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([])

  const isRunning = phase === "scanning" || phase === "running"

  const clearScanTimers = () => {
    scanTimersRef.current.forEach(clearTimeout)
    scanTimersRef.current = []
  }

  const runAgent = async () => {
    if (!url) return
    setLogs([])
    setScanProgress(0)
    setScanText("")
    // Phase 1: Scanning animation
    setPhase("scanning")

    let filters: Record<string, any> = {}
    try { filters = JSON.parse(localStorage.getItem("cp_filters") || "{}") } catch {}

    if (!selectedDimensions.includes("all")) {
      filters.tasks = selectedDimensions
    }
    filters.maxCompetitors = maxCompetitors

    // Start the scan animation steps
    clearScanTimers()
    SCAN_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setScanText(step.text)
        setScanProgress(step.pct)
      }, i * 450)
      scanTimersRef.current.push(t)
    })

    try {
      const data = await startAgent(url, filters)
      if (!data.success || !data.runId) {
        clearScanTimers()
        setPhase("done")
        setLogs([{ id: `${Date.now()}`, timestamp: new Date().toLocaleTimeString(), type: "error", message: data.error || "Failed to start agent" }])
        return
      }
      setRunId(data.runId)
      try { localStorage.setItem(ACTIVE_AGENT_RUN_KEY, data.runId) } catch {}

      // Wait for scan animation to finish (at least ~2.7s total), then switch to running
      const animDelay = Math.max(0, SCAN_STEPS.length * 450 + 300)
      const transitionTimer = setTimeout(() => {
        setPhase("running")
      }, animDelay)
      scanTimersRef.current.push(transitionTimer)

      const es = createLogStream(
        data.runId,
        (msg) => {
          if (msg.message) {
            // Once first real log arrives, ensure we're in running phase
            setPhase(prev => prev === "scanning" ? "running" : prev)
            setLogs(prev => [...prev, {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: msg.level || msg.type || "info",
              message: msg.message,
            }])
          }
        },
        () => {
          setPhase("done")
          try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
        }
      )
      esRef.current = es
    } catch (err) {
      clearScanTimers()
      setPhase("done")
      try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
      setLogs([{ id: `${Date.now()}`, timestamp: new Date().toLocaleTimeString(), type: "error", message: `Agent error: ${err instanceof Error ? err.message : "Unknown"}` }])
    }
  }

  const stopAgent = async () => {
    clearScanTimers()
    if (runId) await cancelAgent(runId).catch(() => {})
    esRef.current?.close()
    setPhase("done")
    try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
  }

  // Restore active run on page refresh
  React.useEffect(() => {
    const savedRunId = (() => { try { return localStorage.getItem(ACTIVE_AGENT_RUN_KEY) } catch { return null } })()
    if (savedRunId) {
      let cancelled = false
      fetchRunReports(savedRunId).then(res => {
        if (cancelled) return
        if (!res.success) {
          try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
          return
        }
        if (!res.done) {
          setRunId(savedRunId)
          setPhase("running")
          const es = createLogStream(
            savedRunId,
            (msg) => {
              if (msg.message) {
                setLogs(prev => [...prev, {
                  id: `${Date.now()}-${Math.random()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  type: msg.level || msg.type || "info",
                  message: msg.message,
                }])
              }
            },
            () => {
              setPhase("done")
              try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
            }
          )
          esRef.current = es
        } else {
          try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
        }
      }).catch(() => {
        try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {}
      })
      return () => { cancelled = true; clearScanTimers(); esRef.current?.close() }
    }
    return () => { clearScanTimers(); esRef.current?.close() }
  }, [])



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Agent</h1>
          <p className="text-sm text-muted-foreground">
            Autonomous browser agent for competitor intelligence gathering
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Bot className="h-3.5 w-3.5" />
          Browser Agent v1.0
        </Badge>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Agent Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dimension Selection — above search */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {DIMENSION_OPTIONS.map((dim) => {
                const selected = selectedDimensions.includes(dim.id)
                const Icon = dim.icon
                return (
                  <button
                    key={dim.id}
                    onClick={() => {
                      if (dim.id === "all") {
                        setSelectedDimensions(["all"])
                      } else {
                        setSelectedDimensions(prev => {
                          const without = prev.filter(d => d !== "all")
                          const next = without.includes(dim.id)
                            ? without.filter(d => d !== dim.id)
                            : [...without, dim.id]
                          return next.length === 0 ? ["all"] : next
                        })
                      }
                    }}
                    disabled={isRunning}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                      selected
                        ? dim.color
                        : "text-muted-foreground bg-muted/50 border-border hover:bg-muted",
                      isRunning && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {dim.label}
                  </button>
                )
              })}
            </div>

            {/* Competitor Count */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Competitors:</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 rounded-full"
                disabled={isRunning}
                onClick={() => setMaxCompetitors(prev => Math.max(0, prev - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-5 text-center">{maxCompetitors}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 rounded-full"
                disabled={isRunning}
                onClick={() => setMaxCompetitors(prev => Math.min(10, prev + 1))}
              >
                <Plus className="h-3 w-3" />
              </Button>
              {maxCompetitors === 0 && (
                <span className="text-xs text-muted-foreground">(self-only, no competitors)</span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter company name or URL (e.g., Slack, https://competitor.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isRunning && url) runAgent() }}
                className="pl-10"
                disabled={isRunning}
              />
            </div>
            {isRunning ? (
              <Button variant="destructive" onClick={stopAgent} className="gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={runAgent} disabled={!url} className="gap-2">
                <Play className="h-4 w-4" />
                Run Agent
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => { setLogs([]); setPhase("idle"); esRef.current?.close(); try { localStorage.removeItem(ACTIVE_AGENT_RUN_KEY) } catch {} }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Scanning Animation — shown below buttons during scanning AND running */}
          {(phase === "scanning" || phase === "running") && (
            <div className="flex flex-col items-center justify-center py-6 space-y-5 animate-in fade-in duration-500">
              {/* Radar animation */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-4 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="text-center space-y-2.5 max-w-sm">
                <p className="text-sm font-medium text-foreground">
                  {phase === "running" ? "Agent scanning..." : (scanText || "Initializing...")}
                </p>
                <div className="w-56 h-1.5 rounded-full bg-muted overflow-hidden mx-auto">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: phase === "running" ? '100%' : `${scanProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {phase === "running" ? "Agent is actively gathering intelligence" : `${scanProgress}% — Initializing AI agent`}
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Live Logs — shown as soon as scanning starts so logs stream in real-time */}
      {(phase === "scanning" || phase === "running" || phase === "done" || (phase === "idle" && logs.length > 0)) && (
        <LiveLogs
          logs={logs}
          isRunning={phase === "scanning" || phase === "running"}
          title="agent-terminal"
          maxHeight="400px"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
        />
      )}

      {/* Stats */}
      {logs.length > 0 && phase === "done" && (
        <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">Total Log Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">
                {logs.filter(l => l.type === "success").length}
              </div>
              <p className="text-xs text-muted-foreground">Success Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">
                {logs.filter(l => l.type === "error").length}
              </div>
              <p className="text-xs text-muted-foreground">Errors</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

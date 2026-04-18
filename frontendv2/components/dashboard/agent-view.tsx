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
  Users,
  ClipboardList,
  Target,
} from "lucide-react"
import { startAgent, createLogStream, cancelAgent, fetchRunReports, loadCollection } from "@/lib/api"
import { LiveLogs } from "@/components/live-logs"
import { ChevronDown, ChevronUp, ExternalLink, Hash, MapPin, FileText, Cpu } from "lucide-react"

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
  const [selectedDimensions, setSelectedDimensions] = React.useState<string[]>([])
  const [maxCompetitors, setMaxCompetitors] = React.useState(5)
  const [scanProgress, setScanProgress] = React.useState(0)
  const [scanText, setScanText] = React.useState("")
  const esRef = React.useRef<EventSource | null>(null)
  const scanTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const [historyItems, setHistoryItems] = React.useState<any[]>([])
  const [historyExpanded, setHistoryExpanded] = React.useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = React.useState<string | null>(null)
  const prevRunningRef = React.useRef(false)

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

    if (selectedDimensions.length > 0 && !selectedDimensions.includes("all")) {
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

  // Load agent history on mount
  React.useEffect(() => {
    loadCollection("agentHistory").then(data => {
      if (Array.isArray(data)) setHistoryItems(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    })
  }, [])

  // Refresh history when a run finishes
  React.useEffect(() => {
    if (prevRunningRef.current && !isRunning) {
      loadCollection("agentHistory").then(data => {
        if (Array.isArray(data)) setHistoryItems(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      })
    }
    prevRunningRef.current = isRunning
  }, [isRunning])


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
                        setSelectedDimensions(prev => prev.includes("all") ? [] : ["all"])
                      } else {
                        setSelectedDimensions(prev => {
                          const without = prev.filter(d => d !== "all")
                          const next = without.includes(dim.id)
                            ? without.filter(d => d !== dim.id)
                            : [...without, dim.id]
                          return next
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

      {/* Collapsible History */}
      <Card>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Analysis History</span>
            {historyItems.length > 0 && (
              <Badge variant="secondary" className="text-xs">{historyItems.length}</Badge>
            )}
          </div>
          {historyExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {historyExpanded && (
          <CardContent className="pt-0 pb-4">
            {historyItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No analysis history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item: any) => {
                  const isOpen = expandedHistoryId === item.id
                  const reports: any[] = item.reports || []
                  return (
                    <div key={item.id} className="rounded-lg border bg-card overflow-hidden">
                      <button
                        onClick={() => setExpandedHistoryId(isOpen ? null : item.id)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors"
                      >
                        {item.status === "complete" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-sm truncate">{item.prompt}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleString()} &middot; {item.competitorsCount || 0} competitors
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-xs shrink-0",
                          item.status === "complete" ? "text-emerald-500 border-emerald-500/30" : "text-rose-500 border-rose-500/30"
                        )}>
                          {item.status}
                        </Badge>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      {isOpen && reports.length > 0 && (
                        <div className="px-3 pb-3 space-y-4">
                          {reports.map((report: any, ri: number) => {
                            const planCount = report.pricing?.plans?.length || 0
                            const jobCount = report.jobs?.length || 0
                            const blogCount = report.blog?.length || 0
                            const featureCount = report.features?.length || 0
                            const socialCount = report.social?.profiles?.length || 0
                            const leadsCount = report.leads?.contacts?.length || 0
                            const formsCount = report.forms?.forms?.length || 0
                            const hasStrategy = !!report.strategy
                            return (
                              <div key={ri} className="rounded-xl border bg-muted/30 overflow-hidden">
                                {/* Competitor Header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b">
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                                    <Globe className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold truncate">{report.company}</h4>
                                    {report.url && (
                                      <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                        {report.url} <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap justify-end">
                                    {planCount > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><DollarSign className="h-2.5 w-2.5" />{planCount} plans</Badge>}
                                    {jobCount > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Briefcase className="h-2.5 w-2.5" />{jobCount} jobs</Badge>}
                                    {report.reviews?.rating && <Badge variant="secondary" className="text-[10px] gap-1"><Star className="h-2.5 w-2.5" />{report.reviews.rating}/5</Badge>}
                                    {featureCount > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Zap className="h-2.5 w-2.5" />{featureCount}</Badge>}
                                    {leadsCount > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Users className="h-2.5 w-2.5" />{leadsCount} leads</Badge>}
                                    {formsCount > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><ClipboardList className="h-2.5 w-2.5" />{formsCount} forms</Badge>}
                                    {hasStrategy && <Badge variant="secondary" className="text-[10px] gap-1"><Target className="h-2.5 w-2.5" />Strategy</Badge>}
                                  </div>
                                </div>

                                <div className="p-4 space-y-4">
                                  {/* Pricing */}
                                  {report.pricing?.plans?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing Plans</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {report.pricing.plans.map((plan: any, pi: number) => (
                                          <div key={pi} className="rounded-lg p-3 bg-background border">
                                            <div className="text-sm font-bold">{plan.name}</div>
                                            <div className="text-lg font-extrabold text-emerald-500">{plan.price}</div>
                                            {plan.period && <div className="text-[10px] text-muted-foreground">{plan.period}</div>}
                                            {plan.features?.slice(0, 3).map((f: string, fi: number) => (
                                              <div key={fi} className="text-xs mt-1 flex items-start gap-1 text-muted-foreground">
                                                <span className="text-emerald-500 mt-0.5">✓</span>
                                                <span className="line-clamp-1">{f}</span>
                                              </div>
                                            ))}
                                            {plan.features?.length > 3 && <div className="text-[10px] text-muted-foreground mt-1">+{plan.features.length - 3} more</div>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Jobs */}
                                  {report.jobs?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Positions</span>
                                      </div>
                                      <div className="space-y-1">
                                        {report.jobs.slice(0, 6).map((job: any, ji: number) => (
                                          <div key={ji} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm">
                                            <span className="flex-1 font-medium truncate">{job.title}</span>
                                            {job.department && <Badge variant="outline" className="text-[10px]">{job.department}</Badge>}
                                            {job.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.location}</span>}
                                          </div>
                                        ))}
                                        {report.jobs.length > 6 && <div className="text-xs text-center py-1 text-muted-foreground">+{report.jobs.length - 6} more</div>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Reviews */}
                                  {report.reviews && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Star className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviews — {report.reviews.platform || "G2"}</span>
                                      </div>
                                      <div className="flex items-center gap-3 p-2 rounded-lg bg-background border">
                                        {report.reviews.rating && <span className="text-2xl font-extrabold text-amber-500">{report.reviews.rating}</span>}
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <Star key={s} className={cn("h-3.5 w-3.5", s <= Math.round(report.reviews.rating || 0) ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                                          ))}
                                        </div>
                                        {report.reviews.totalReviews && <span className="text-xs text-muted-foreground">{report.reviews.totalReviews} reviews</span>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Blog */}
                                  {report.blog?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Newspaper className="h-3.5 w-3.5 text-violet-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Posts</span>
                                      </div>
                                      <div className="space-y-1">
                                        {report.blog.slice(0, 4).map((post: any, bi: number) => (
                                          <div key={bi} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                                            <span className="flex-1 font-medium truncate">{post.title}</span>
                                            {post.date && <span className="text-[10px] text-muted-foreground shrink-0">{post.date}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Features */}
                                  {report.features?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Zap className="h-3.5 w-3.5 text-cyan-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Features</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {report.features.map((f: string, fi: number) => (
                                          <span key={fi} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-medium">{f}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Social */}
                                  {report.social?.profiles?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Share2 className="h-3.5 w-3.5 text-pink-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social Media</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {report.social.profiles.map((profile: any, si: number) => (
                                          <a key={si} href={profile.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm hover:border-pink-500/30 transition-colors no-underline">
                                            <Share2 className="h-3 w-3 text-pink-500 shrink-0" />
                                            <span className="font-medium truncate">{profile.platform}</span>
                                            {(profile.followers || profile.subscribers) && (
                                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{profile.followers || profile.subscribers}</span>
                                            )}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Leads */}
                                  {report.leads?.contacts?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Users className="h-3.5 w-3.5 text-orange-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Contacts</span>
                                      </div>
                                      <div className="space-y-1">
                                        {report.leads.contacts.slice(0, 6).map((contact: any, li: number) => (
                                          <div key={li} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm">
                                            <Users className="h-3 w-3 text-orange-500 shrink-0" />
                                            <span className="font-medium truncate">{contact.name}</span>
                                            {contact.title && <Badge variant="outline" className="text-[10px]">{contact.title}</Badge>}
                                          </div>
                                        ))}
                                        {report.leads.contacts.length > 6 && <div className="text-xs text-center py-1 text-muted-foreground">+{report.leads.contacts.length - 6} more</div>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Forms */}
                                  {report.forms?.forms?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <ClipboardList className="h-3.5 w-3.5 text-teal-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Forms</span>
                                      </div>
                                      <div className="space-y-1">
                                        {report.forms.forms.map((form: any, fi: number) => (
                                          <div key={fi} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm">
                                            <ClipboardList className="h-3 w-3 text-teal-500 shrink-0" />
                                            <span className="font-medium capitalize">{form.type}</span>
                                            {form.fields && <span className="text-[10px] text-muted-foreground ml-auto">{form.fields.length} fields</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Strategy */}
                                  {report.strategy && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Target className="h-3.5 w-3.5 text-rose-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strategy</span>
                                      </div>
                                      <div className="rounded-lg p-3 bg-background border space-y-2">
                                        {report.strategy.tagline && (
                                          <div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tagline</div>
                                            <div className="text-sm font-medium">{report.strategy.tagline}</div>
                                          </div>
                                        )}
                                        {report.strategy.targetAudience && (
                                          <div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Target Audience</div>
                                            <div className="text-sm">{report.strategy.targetAudience}</div>
                                          </div>
                                        )}
                                        {report.strategy.positioning && (
                                          <div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Positioning</div>
                                            <div className="text-sm">{report.strategy.positioning}</div>
                                          </div>
                                        )}
                                        {report.strategy.differentiators?.length > 0 && (
                                          <div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Differentiators</div>
                                            <div className="flex flex-wrap gap-1">
                                              {report.strategy.differentiators.map((d: string, di: number) => (
                                                <span key={di} className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">{d}</span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {isOpen && reports.length === 0 && (
                        <div className="px-3 pb-3 text-center py-4 text-muted-foreground text-xs">
                          No report data available for this run
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
    </div>
  )
}

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChatInput } from "@/components/chat-input"
import { LiveLogs, LogEntry } from "@/components/live-logs"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Zap, 
  Shield,
  BarChart3,
  Globe,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  FileText,
  Briefcase,
  Bot,
  LayoutDashboard,
  Target,
  Database,
  History,
  Square,
  DollarSign,
  Star,
  BookOpen,
  Minus,
  Plus,
  Layers,
  Newspaper,
  Share2,
} from "lucide-react"
import { useAgentLogs } from "@/hooks/use-agent-logs"
import { cancelAgent } from "@/lib/api"

interface HomeViewProps {
  onAnalysisComplete?: (result: unknown) => void
  onNavigate?: (view: string) => void
}

type HomePhase = "idle" | "scanning" | "running" | "done"

const DIMENSION_OPTIONS = [
  { id: "all", label: "All", icon: Layers, color: "text-primary bg-primary/10 border-primary/30" },
  { id: "pricing", label: "Price", icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { id: "reviews", label: "Review", icon: Star, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { id: "jobs", label: "Job", icon: Briefcase, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { id: "blog", label: "Blog / News", icon: Newspaper, color: "text-violet-500 bg-violet-500/10 border-violet-500/30" },
  { id: "features", label: "Features", icon: Zap, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" },
  { id: "social", label: "Social Media", icon: Share2, color: "text-pink-500 bg-pink-500/10 border-pink-500/30" },
] as const

const SCAN_STEPS = [
  { text: "Connecting to AI engine...", pct: 10 },
  { text: "Analyzing market position...", pct: 25 },
  { text: "Identifying competitor landscape...", pct: 45 },
  { text: "Mapping industry verticals...", pct: 65 },
  { text: "Preparing browser agent...", pct: 85 },
  { text: "Agent ready — launching scan...", pct: 100 },
]

const quickActions = [
  { id: "agent", label: "AI Agent", icon: Bot, view: "agent", color: "text-primary bg-primary/10 border-primary/20 hover:bg-primary/20" },
  { id: "pricing", label: "Pricing Intel", icon: TrendingUp, view: "agent", color: "text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20" },
  { id: "jobs", label: "Job Tracker", icon: Briefcase, view: "agent", color: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
  { id: "strategy", label: "Strategy", icon: Target, view: "strategy", color: "text-red-500 bg-red-500/10 border-red-500/20 hover:bg-red-500/20" },
  { id: "leads", label: "Lead Gen", icon: Users, view: "leads", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
  { id: "forms", label: "Form Filler", icon: FileText, view: "forms", color: "text-violet-500 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, view: "dashboard", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20" },
  { id: "intel", label: "Intel DB", icon: Database, view: "intel", color: "text-orange-500 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20" },
  { id: "history", label: "History", icon: History, view: "history", color: "text-pink-500 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20" },
]

export function HomeView({ onAnalysisComplete, onNavigate }: HomeViewProps) {
  const [phase, setPhase] = useState<HomePhase>("idle")
  const [scanProgress, setScanProgress] = useState(0)
  const [scanText, setScanText] = useState("")
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([])
  const [maxCompetitors, setMaxCompetitors] = useState(5)
  const { logs, isRunning, startAnalysis, activeRunId } = useAgentLogs()
  const scanTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearScanTimers = () => {
    scanTimersRef.current.forEach(clearTimeout)
    scanTimersRef.current = []
  }

  // Restore running state on page refresh (hook auto-reconnects SSE)
  useEffect(() => {
    if (isRunning && phase === "idle" && activeRunId) {
      setPhase("running")
    }
  }, [isRunning, phase, activeRunId])

  // Transition from scanning to running when real logs arrive
  useEffect(() => {
    if (logs.length > 0 && phase === "scanning") {
      setPhase("running")
    }
  }, [logs.length, phase])

  // Transition to done when isRunning becomes false after running
  useEffect(() => {
    if (!isRunning && phase === "running") {
      setPhase("done")
    }
  }, [isRunning, phase])

  useEffect(() => {
    return () => clearScanTimers()
  }, [])

  const toggleDimension = (id: string) => {
    if (id === "all") {
      setSelectedDimensions(prev => prev.includes("all") ? [] : ["all"])
    } else {
      setSelectedDimensions(prev => {
        const without = prev.filter(d => d !== "all")
        const next = without.includes(id)
          ? without.filter(d => d !== id)
          : [...without, id]
        return next
      })
    }
  }

  const handleSubmit = async (url: string) => {
    // Empty or "all" means no filter — send all tasks

    setScanProgress(0)
    setScanText("")
    setPhase("scanning")

    // Animate scan steps
    clearScanTimers()
    SCAN_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setScanText(step.text)
        setScanProgress(step.pct)
      }, i * 450)
      scanTimersRef.current.push(t)
    })

    const runId = await startAnalysis(url, {
      tasks: (selectedDimensions.length === 0 || selectedDimensions.includes("all")) ? undefined : selectedDimensions,
      maxCompetitors,
    })

    if (!runId) {
      clearScanTimers()
      setPhase("done")
    } else {
      // After scan animation completes, transition to running if not already
      const transitionTimer = setTimeout(() => {
        setPhase(prev => prev === "scanning" ? "running" : prev)
      }, SCAN_STEPS.length * 450 + 300)
      scanTimersRef.current.push(transitionTimer)
    }
  }

  const handleStop = async () => {
    clearScanTimers()
    if (activeRunId) {
      await cancelAgent(activeRunId).catch(() => {})
    }
    setPhase("done")
  }

  const isActive = phase === "scanning" || phase === "running"

  const features = [
    {
      icon: Zap,
      title: "Real-time Analysis",
      description: "AI-powered browser agent extracts data in seconds",
    },
    {
      icon: Shield,
      title: "Comprehensive Intel",
      description: "Pricing, jobs, reviews, and strategic insights",
    },
    {
      icon: BarChart3,
      title: "Actionable Strategy",
      description: "GTM plans, market sizing, and positioning",
    },
  ]

  const [recentAnalyses, setRecentAnalyses] = useState<
    { domain: string; time: string; status: string }[]
  >([])

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch("/api/history")
        const data = await res.json()
        if (data.items?.length) {
          setRecentAnalyses(
            data.items.slice(0, 5).map((item: any) => ({
              domain: item.target || "Unknown",
              time: formatRelativeTime(item.timestamp),
              status: item.status === "success" ? "complete" : item.status,
            }))
          )
        }
      } catch {}
    }
    loadRecent()
  }, [])

  function formatRelativeTime(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <ScrollReveal direction="up" delay={0}>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-8">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered Intelligence
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Understand Your Competition in{" "}
              <span className="text-primary">Minutes</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              CompetitorPulse uses advanced AI agents to automatically analyze competitor 
              websites, extract pricing data, job postings, reviews, and generate 
              strategic recommendations.
            </p>
          </div>
        </ScrollReveal>

        {/* Dimension & Competitor Filters — above search */}
        {phase === "idle" && (
          <ScrollReveal direction="up" delay={80} className="w-full max-w-2xl mx-auto mb-4">
            <div className="flex flex-col gap-3">
              {/* Dimension pills */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {DIMENSION_OPTIONS.map((dim) => {
                  const selected = selectedDimensions.includes(dim.id)
                  const Icon = dim.icon
                  return (
                    <button
                      key={dim.id}
                      onClick={() => toggleDimension(dim.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                        selected
                          ? dim.color
                          : "text-muted-foreground bg-muted/50 border-border hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {dim.label}
                    </button>
                  )
                })}
              </div>
              {/* Competitor count */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground">Competitors:</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setMaxCompetitors(prev => Math.max(0, prev - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium w-6 text-center">{maxCompetitors}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setMaxCompetitors(prev => Math.min(10, prev + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                {maxCompetitors === 0 && (
                  <span className="text-xs text-muted-foreground">(self-only, no competitors)</span>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Chat Input + Stop Button */}
        <ScrollReveal direction="up" delay={100} className="w-full max-w-2xl mx-auto mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ChatInput 
                onSubmit={handleSubmit}
                isLoading={isActive}
                placeholder="Enter company name or URL (e.g., Slack, stripe.com)"
              />
            </div>
            {isActive && (
              <Button variant="destructive" onClick={handleStop} className="gap-2 shrink-0">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </ScrollReveal>

        {/* Scanning Animation — shown during scanning AND running */}
        {(phase === "scanning" || phase === "running") && (
          <div className="w-full max-w-2xl mx-auto mb-6 animate-in fade-in duration-500">
            <div className="flex flex-col items-center justify-center py-8 space-y-5">
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
          </div>
        )}

        {/* Quick Action Pills */}
        {phase === "idle" && logs.length === 0 && (
          <ScrollReveal direction="up" delay={150} className="w-full max-w-2xl mx-auto mb-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className={`rounded-full border ${action.color} transition-all`}
                  onClick={() => onNavigate?.(action.view)}
                >
                  <action.icon className="mr-1.5 h-3.5 w-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Live Logs (shown as soon as scanning starts) */}
        {(phase === "scanning" || phase === "running" || phase === "done") && logs.length > 0 && (
          <div className="w-full max-w-4xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <LiveLogs 
              logs={logs}
              isRunning={phase === "running"}
              title="Agent Analysis"
              maxHeight="300px"
            />
          </div>
        )}

        {/* Features */}
        {phase === "idle" && logs.length === 0 && (
          <ScrollReveal direction="up" delay={200} className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Card 
                  key={feature.title}
                  className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Recent Analyses */}
      {!isRunning && logs.length === 0 && recentAnalyses.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Analyses</h3>
              <button 
                className="text-sm text-primary hover:underline"
                onClick={() => onNavigate?.("history")}
              >
                View all
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {recentAnalyses.map((analysis, idx) => (
                <button
                  key={`${analysis.domain}-${idx}`}
                  onClick={() => handleSubmit(analysis.domain)}
                  className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm border border-border hover:border-primary/30 transition-colors"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{analysis.domain}</span>
                  <span className="text-muted-foreground">•</span>
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">{analysis.time}</span>
                  {analysis.status === "complete" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

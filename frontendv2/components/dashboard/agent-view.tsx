"use client"

import * as React from "react"
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
  XCircle,
  Clock,
  Zap
} from "lucide-react"

interface AgentLog {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error" | "action"
  message: string
}

const AGENT_STEPS = [
  { type: "action" as const, message: "Initializing browser agent..." },
  { type: "info" as const, message: "Loading target URL" },
  { type: "action" as const, message: "Navigating to homepage" },
  { type: "info" as const, message: "Page loaded successfully" },
  { type: "action" as const, message: "Searching for pricing page..." },
  { type: "info" as const, message: "Found link: /pricing" },
  { type: "action" as const, message: "Navigating to pricing page" },
  { type: "success" as const, message: "Extracting pricing tiers..." },
  { type: "info" as const, message: "Found 3 pricing tiers: Starter, Pro, Enterprise" },
  { type: "action" as const, message: "Searching for careers page..." },
  { type: "info" as const, message: "Found link: /careers" },
  { type: "action" as const, message: "Navigating to careers page" },
  { type: "success" as const, message: "Extracting job listings..." },
  { type: "info" as const, message: "Found 47 open positions" },
  { type: "action" as const, message: "Analyzing department distribution..." },
  { type: "info" as const, message: "Engineering: 18, Sales: 12, Marketing: 8" },
  { type: "action" as const, message: "Searching for review aggregators..." },
  { type: "info" as const, message: "Checking G2, Capterra, TrustRadius" },
  { type: "success" as const, message: "Collected reviews from 3 platforms" },
  { type: "info" as const, message: "Average rating: 4.2/5 (1,847 reviews)" },
  { type: "action" as const, message: "Generating AI insights..." },
  { type: "success" as const, message: "Analysis complete! Found 4 strategic insights" },
]

export function AgentView() {
  const [url, setUrl] = React.useState("")
  const [isRunning, setIsRunning] = React.useState(false)
  const [logs, setLogs] = React.useState<AgentLog[]>([])
  const [currentStep, setCurrentStep] = React.useState(0)
  const logsEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [logs])

  const addLog = React.useCallback((step: typeof AGENT_STEPS[0]) => {
    const newLog: AgentLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: step.type,
      message: step.message,
    }
    setLogs(prev => [...prev, newLog])
  }, [])

  const runAgent = async () => {
    if (!url) return
    
    setIsRunning(true)
    setLogs([])
    setCurrentStep(0)

    for (let i = 0; i < AGENT_STEPS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400))
      addLog(AGENT_STEPS[i])
      setCurrentStep(i + 1)
    }

    setIsRunning(false)
  }

  const stopAgent = () => {
    setIsRunning(false)
  }

  const getLogIcon = (type: AgentLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />
      case "warning":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />
      case "action":
        return <Zap className="h-3.5 w-3.5 text-primary" />
      default:
        return <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30" />
    }
  }

  const getLogColor = (type: AgentLog["type"]) => {
    switch (type) {
      case "success":
        return "text-emerald-500"
      case "error":
        return "text-red-500"
      case "warning":
        return "text-amber-500"
      case "action":
        return "text-primary"
      default:
        return "text-muted-foreground"
    }
  }

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
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter competitor URL (e.g., https://competitor.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
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
            <Button variant="outline" size="icon" onClick={() => setLogs([])}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round((currentStep / AGENT_STEPS.length) * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentStep / AGENT_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terminal */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-2 font-mono text-sm text-muted-foreground">agent-terminal</span>
            </div>
            {isRunning && (
              <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Running
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto bg-background/50 p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Enter a URL and click &quot;Run Agent&quot; to start analysis...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 py-0.5">
                    <span className="text-muted-foreground/60 shrink-0">[{log.timestamp}]</span>
                    {getLogIcon(log.type)}
                    <span className={getLogColor(log.type)}>{log.message}</span>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="text-muted-foreground/60">[{new Date().toLocaleTimeString()}]</span>
                    <span className="inline-block h-4 w-2 animate-pulse bg-primary" />
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {logs.length > 0 && !isRunning && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{logs.filter(l => l.type === "action").length}</div>
              <p className="text-xs text-muted-foreground">Actions Performed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">
                {logs.filter(l => l.type === "success").length}
              </div>
              <p className="text-xs text-muted-foreground">Data Points Collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Pages Visited</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {((currentStep / AGENT_STEPS.length) * 8).toFixed(1)}s
              </div>
              <p className="text-xs text-muted-foreground">Total Runtime</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

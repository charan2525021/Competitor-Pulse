"use client"

import { useState, useEffect, useRef } from "react"
import { Terminal, Circle } from "lucide-react"

interface LogEntry {
  id: number
  timestamp: string
  message: string
  type: "info" | "success" | "warning" | "progress"
}

const DEMO_LOGS: Omit<LogEntry, "id" | "timestamp">[] = [
  { message: "Initializing analysis engine...", type: "info" },
  { message: "Connecting to target: competitor.com", type: "info" },
  { message: "Navigating to pricing page...", type: "progress" },
  { message: "Extracting pricing tier data...", type: "progress" },
  { message: "Found 4 pricing plans", type: "success" },
  { message: "Navigating to careers page...", type: "progress" },
  { message: "Scanning job listings...", type: "progress" },
  { message: "Detected 47 open positions", type: "success" },
  { message: "Querying review aggregators...", type: "progress" },
  { message: "G2 rating: 4.7/5 (892 reviews)", type: "success" },
  { message: "Capterra rating: 4.5/5 (355 reviews)", type: "success" },
  { message: "Running sentiment analysis on reviews...", type: "progress" },
  { message: "Identified 3 key pain points", type: "warning" },
  { message: "Analyzing product changelog...", type: "progress" },
  { message: "Detected AI feature investment trend", type: "success" },
  { message: "Cross-referencing funding data...", type: "progress" },
  { message: "Series C: $45M (verified)", type: "success" },
  { message: "Generating strategic insights...", type: "progress" },
  { message: "Analysis complete", type: "success" },
]

function getTimestamp(): string {
  const now = new Date()
  return now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function getTypeColor(type: LogEntry["type"]): string {
  switch (type) {
    case "success":
      return "text-emerald-400"
    case "warning":
      return "text-amber-400"
    case "progress":
      return "text-primary"
    default:
      return "text-muted-foreground"
  }
}

function getTypePrefix(type: LogEntry["type"]): string {
  switch (type) {
    case "success":
      return "[OK]"
    case "warning":
      return "[!!]"
    case "progress":
      return "[..]"
    default:
      return "[--]"
  }
}

interface ActivityPanelProps {
  isRunning?: boolean
  onComplete?: () => void
}

export function ActivityPanel({ isRunning = false, onComplete }: ActivityPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Streaming logs effect
  useEffect(() => {
    if (!isRunning) {
      setLogs([])
      setCurrentIndex(0)
      return
    }

    if (currentIndex >= DEMO_LOGS.length) {
      onComplete?.()
      return
    }

    const delay = Math.random() * 400 + 200 // 200-600ms random delay

    const timeout = setTimeout(() => {
      const newLog: LogEntry = {
        id: currentIndex,
        timestamp: getTimestamp(),
        ...DEMO_LOGS[currentIndex],
      }
      setLogs((prev) => [...prev, newLog])
      setCurrentIndex((prev) => prev + 1)
    }, delay)

    return () => clearTimeout(timeout)
  }, [isRunning, currentIndex, onComplete])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="rounded-xl border border-border bg-[#0a0a0f] overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111118] border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <Circle className="w-3 h-3 fill-rose-500 text-rose-500" />
          <Circle className="w-3 h-3 fill-amber-500 text-amber-500" />
          <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Agent Activity
          </span>
        </div>
        {isRunning && (
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs text-primary">Live</span>
          </div>
        )}
      </div>

      {/* Terminal Content */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 font-mono text-sm scrollbar-thin"
      >
        {logs.length === 0 && !isRunning ? (
          <div className="text-muted-foreground/50 text-xs">
            {">"} Waiting for analysis to start...
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log, index) => (
              <div
                key={log.id}
                className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="text-muted-foreground/60 text-xs shrink-0">
                  {log.timestamp}
                </span>
                <span className={`text-xs shrink-0 ${getTypeColor(log.type)}`}>
                  {getTypePrefix(log.type)}
                </span>
                <span className="text-foreground/90 text-xs">
                  {log.message}
                </span>
              </div>
            ))}
            {/* Cursor line */}
            {isRunning && currentIndex < DEMO_LOGS.length && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-muted-foreground/60 text-xs">
                  {getTimestamp()}
                </span>
                <span className="text-primary text-xs">[..]</span>
                <span
                  className={`text-primary text-xs transition-opacity duration-100 ${
                    showCursor ? "opacity-100" : "opacity-0"
                  }`}
                >
                  _
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-2 bg-[#111118] border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground/60">
          <span>
            {logs.length} / {DEMO_LOGS.length} steps
          </span>
          {logs.length === DEMO_LOGS.length && (
            <span className="text-emerald-400">Analysis complete</span>
          )}
        </div>
      </div>
    </div>
  )
}

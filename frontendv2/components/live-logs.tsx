"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Minimize2,
  Maximize2
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface LogEntry {
  id: string
  timestamp: Date | string
  message: string
  type: "info" | "success" | "error" | "warning" | "progress" | "action"
  step?: string
}

interface LiveLogsProps {
  logs: LogEntry[]
  isRunning?: boolean
  title?: string
  className?: string
  maxHeight?: string
  collapsible?: boolean
}

export function LiveLogs({ 
  logs, 
  isRunning = false, 
  title = "Agent Activity",
  className,
  maxHeight = "400px",
  collapsible = true
}: LiveLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setAutoScroll(isAtBottom)
    }
  }

  const getIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "progress":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      default:
        return <span className="h-4 w-4 text-muted-foreground">{">"}</span>
    }
  }

  const getTextColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-emerald-400"
      case "error":
        return "text-rose-400"
      case "warning":
        return "text-amber-400"
      case "progress":
        return "text-primary"
      default:
        return "text-foreground/80"
    }
  }

  const formatTimestamp = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className={cn(
      "overflow-hidden rounded-xl border border-border bg-card",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm text-foreground">{title}</span>
          </div>

          {/* Live Indicator */}
          {isRunning && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-500">Live</span>
            </div>
          )}
        </div>

        {/* Controls */}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Logs Container */}
      {!isCollapsed && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto bg-background/50 p-4 font-mono text-sm"
          style={{ maxHeight }}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Terminal className="mb-3 h-8 w-8 opacity-50" />
              <p>Waiting for agent activity...</p>
              <p className="mt-1 text-xs">Logs will appear here when the agent starts</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors",
                    "hover:bg-muted/30",
                    index === logs.length - 1 && isRunning && "animate-pulse"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(log.type)}
                  </div>

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    [{formatTimestamp(log.timestamp)}]
                  </span>

                  {/* Step Badge */}
                  {log.step && (
                    <span className="flex-shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {log.step}
                    </span>
                  )}

                  {/* Message */}
                  <span className={cn("flex-1", getTextColor(log.type))}>
                    {log.message}
                  </span>
                </div>
              ))}

              {/* Blinking Cursor */}
              {isRunning && (
                <div className="flex items-center gap-3 px-2 py-1.5">
                  <span className="text-muted-foreground">{">"}</span>
                  <span className="h-4 w-2 animate-pulse bg-primary" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scroll to Bottom Button */}
      {!isCollapsed && !autoScroll && logs.length > 5 && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAutoScroll(true)
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              })
            }}
            className="gap-1 shadow-lg"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="text-xs">Scroll to bottom</span>
          </Button>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Search, Globe, FileText, CheckCircle2, XCircle, Loader2, ScrollText,
  DollarSign, Briefcase, Star, Sparkles, ClipboardList, Zap, Bot,
  ChevronDown, Link, Cpu, Radar, Play, Square,
} from "lucide-react"

export interface LogEntry {
  id: string
  timestamp: Date | string
  message: string
  type: string
}

interface LiveLogsProps {
  logs: LogEntry[]
  isRunning?: boolean
  title?: string
  className?: string
  maxHeight?: string
}

/* ── keyword → icon / color / label ── */
function getLogMeta(message: string, type: string) {
  if (type === "error") return { icon: <XCircle size={15} />, color: "#ef4444", label: "Error" }
  if (type === "complete") return { icon: <CheckCircle2 size={15} />, color: "#22c55e", label: "Done" }
  const m = message.toLowerCase()
  if (m.includes("generating") && m.includes("plan")) return { icon: <ClipboardList size={15} />, color: "#a855f7", label: "Planning" }
  if (m.includes("plan ready")) return { icon: <Sparkles size={15} />, color: "#a855f7", label: "Plan" }
  if (m.startsWith("you asked")) return { icon: <Search size={15} />, color: "#3b82f6", label: "Query" }
  if (m.includes("targets identified")) return { icon: <Radar size={15} />, color: "#ec4899", label: "Targets" }
  if (m.includes("analyzing") || m.includes("analyze")) return { icon: <Radar size={15} />, color: "#8b5cf6", label: "Analyze" }
  if (m.includes("pricing")) return { icon: <DollarSign size={15} />, color: "#22c55e", label: "Pricing" }
  if (m.includes("job") || m.includes("career") || m.includes("position")) return { icon: <Briefcase size={15} />, color: "#3b82f6", label: "Jobs" }
  if (m.includes("review") || m.includes("g2")) return { icon: <Star size={15} />, color: "#f59e0b", label: "Reviews" }
  if (m.includes("blog") || m.includes("post") || m.includes("changelog")) return { icon: <FileText size={15} />, color: "#8b5cf6", label: "Blog" }
  if (m.includes("feature")) return { icon: <Cpu size={15} />, color: "#06b6d4", label: "Features" }
  if (m.includes("searching") || m.includes("search")) return { icon: <Search size={15} />, color: "#3b82f6", label: "Search" }
  if (m.includes("found") && m.includes("result")) return { icon: <FileText size={15} />, color: "#06b6d4", label: "Results" }
  if (m.includes("opening") || m.includes("navigate") || m.includes("visit")) return { icon: <Globe size={15} />, color: "#06b6d4", label: "Navigate" }
  if (m.includes("ai agent started")) return { icon: <Bot size={15} />, color: "#8b5cf6", label: "Agent" }
  if (m.includes("connected") || m.includes("browser")) return { icon: <Link size={15} />, color: "#64748b", label: "Connect" }
  if (m.includes("step completed")) return { icon: <CheckCircle2 size={15} />, color: "#22c55e", label: "Done" }
  if (m.includes("finished analyzing") || m.includes("finished")) return { icon: <CheckCircle2 size={15} />, color: "#22c55e", label: "Complete" }
  if (m.includes("all done") || m.includes("intelligence report")) return { icon: <Sparkles size={15} />, color: "#22c55e", label: "Complete" }
  if (m.includes("lead") || m.includes("contact")) return { icon: <Search size={15} />, color: "#3b82f6", label: "Leads" }
  if (m.includes("form") || m.includes("filling") || m.includes("submit")) return { icon: <FileText size={15} />, color: "#8b5cf6", label: "Form" }
  if (m.includes("strategy") || m.includes("market") || m.includes("distribution") || m.includes("weakness")) return { icon: <Sparkles size={15} />, color: "#a855f7", label: "Strategy" }
  if (m.includes("agent")) return { icon: <Bot size={15} />, color: "#8b5cf6", label: "Agent" }
  if (m.includes("something went wrong") || m.includes("failed") || m.includes("could not") || m.includes("error")) return { icon: <XCircle size={15} />, color: "#ef4444", label: "Error" }
  if (m.includes("using ai") || m.includes("compile") || m.includes("llm") || m.includes("groq")) return { icon: <Sparkles size={15} />, color: "#a855f7", label: "AI" }
  if (m.includes("social") || m.includes("twitter") || m.includes("linkedin")) return { icon: <Globe size={15} />, color: "#ec4899", label: "Social" }
  if (m.includes("cancelled") || m.includes("stopped")) return { icon: <Square size={15} />, color: "#ef4444", label: "Stopped" }
  return { icon: <Zap size={15} />, color: "#64748b", label: "Info" }
}

/* ── Single log row with typewriter + expand ── */
function LogRow({ log, index, skipAnimation }: { log: LogEntry; index: number; skipAnimation?: boolean }) {
  const { icon, color, label } = getLogMeta(log.message, log.type)
  const [expanded, setExpanded] = useState(false)
  const [displayedText, setDisplayedText] = useState(skipAnimation ? log.message : "")
  const [doneTyping, setDoneTyping] = useState(!!skipAnimation)

  useEffect(() => {
    if (skipAnimation) { setDisplayedText(log.message); setDoneTyping(true); return }
    let i = 0
    setDisplayedText("")
    setDoneTyping(false)
    const interval = setInterval(() => {
      i++
      if (i <= log.message.length) {
        setDisplayedText(log.message.slice(0, i))
      } else {
        clearInterval(interval)
        setDoneTyping(true)
      }
    }, 10)
    return () => clearInterval(interval)
  }, [log.message, skipAnimation])

  const hasLiveView = log.message.includes("Live view available: ")
  const liveViewUrl = hasLiveView ? log.message.split("Live view available: ")[1]?.trim() : null

  return (
    <div className="log-row-enter" style={{ animationDelay: skipAnimation ? "0ms" : `${index * 30}ms` }}>
      <div
        className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer group hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon badge */}
        <span
          className={cn(
            "shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-opacity duration-300",
            doneTyping ? "log-icon-pop opacity-100" : "opacity-40"
          )}
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </span>

        {/* Category badge */}
        <span
          className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{ backgroundColor: `${color}12`, color }}
        >
          {label}
        </span>

        {/* Message text with typewriter */}
        <span className="flex-1 text-sm truncate text-foreground">
          {hasLiveView ? (
            <>
              <span>🔴 Live view: </span>
              <a
                href={liveViewUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:opacity-80 transition-opacity text-blue-500"
                onClick={(e) => e.stopPropagation()}
              >
                Open in new tab ↗
              </a>
            </>
          ) : (
            <>
              {displayedText}
              {!doneTyping && (
                <span
                  className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse align-text-bottom"
                  style={{ backgroundColor: color }}
                />
              )}
            </>
          )}
        </span>

        {/* Scan bar flash */}
        {doneTyping && <span className="log-scan-bar shrink-0" style={{ backgroundColor: color }} />}

        {/* Expand chevron */}
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground shrink-0 transition-transform duration-300",
            expanded && "rotate-180"
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="ml-10 mr-3 mb-2 px-3 py-2.5 rounded-xl text-xs font-mono animate-scale-in space-y-1.5 bg-muted border border-border text-muted-foreground">
          {hasLiveView && liveViewUrl ? (
            <div className="space-y-2">
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 8 }}>
                <iframe
                  src={liveViewUrl}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }}
                  title="TinyFish Live Browser"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              <a
                href={liveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] underline text-blue-500"
              >
                Open in new tab ↗
              </a>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Time:</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Type:</span>
                <span style={{ color }}>{log.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Full message:</span>
                <p className="mt-1 whitespace-pre-wrap break-all text-foreground">{log.message}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main LiveLogs component ── */
export function LiveLogs({
  logs,
  isRunning = false,
  title,
  className,
  maxHeight = "400px",
}: LiveLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [replaying, setReplaying] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs, replayIndex])

  useEffect(() => {
    return () => { if (replayTimer.current) clearTimeout(replayTimer.current) }
  }, [])

  const startReplay = useCallback(() => {
    setReplaying(true)
    setReplayIndex(0)
    let idx = 0
    const advance = () => {
      idx++
      if (idx <= logs.length) {
        setReplayIndex(idx)
        replayTimer.current = setTimeout(advance, 120 + Math.random() * 80)
      } else {
        setReplaying(false)
      }
    }
    replayTimer.current = setTimeout(advance, 200)
  }, [logs.length])

  const stopReplay = useCallback(() => {
    if (replayTimer.current) clearTimeout(replayTimer.current)
    setReplaying(false)
    setReplayIndex(logs.length)
  }, [logs.length])

  const canReplay = logs.length > 0 && !isRunning
  const displayLogs = replaying ? logs.slice(0, replayIndex) : logs

  return (
    <div className={cn(
      "flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden bg-card border border-border shadow-md",
      className
    )}>
      {/* Toolbar */}
      {canReplay && (
        <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-border">
          {replaying ? (
            <button
              onClick={stopReplay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              <Square size={11} /> Stop
            </button>
          ) : (
            <button
              onClick={startReplay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105 bg-primary/10 text-primary"
            >
              <Play size={11} /> Replay Demo
            </button>
          )}
          {replaying && (
            <span className="text-[10px] font-medium text-muted-foreground">
              {replayIndex}/{logs.length} logs
            </span>
          )}
          <div className="flex-1" />
          {title && <span className="text-[10px] text-muted-foreground mr-2">{title}</span>}
          <span className="text-[10px] text-muted-foreground">
            {logs.length} log{logs.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Log content */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 text-sm space-y-0.5"
        style={{ maxHeight }}
      >
        {logs.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-muted-foreground">
            <ScrollText size={36} className="opacity-25" />
            <span className="text-sm">Agent logs will appear here...</span>
          </div>
        )}

        {displayLogs.map((log, i) => (
          <LogRow
            key={`${replaying ? "r" : "l"}-${log.id}-${i}`}
            log={log}
            index={i}
            skipAnimation={!replaying && !isRunning}
          />
        ))}

        {/* Scanning the web... loader */}
        {(isRunning || replaying) && (
          <div className="flex items-center gap-3 py-2.5 px-3 log-row-enter" style={{ color: "#eab308" }}>
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(234,179,8,0.12)" }}
            >
              <Loader2 size={15} className="animate-spin" />
            </span>
            <span className="text-sm log-pulse-text">
              {replaying ? "Replaying..." : "Scanning the web..."}
            </span>
            <span className="flex-1 h-0.5 rounded-full overflow-hidden bg-muted">
              <span className="log-progress-bar block h-full rounded-full" style={{ backgroundColor: "#eab308" }} />
            </span>
          </div>
        )}

        <div />
      </div>
    </div>
  )
}

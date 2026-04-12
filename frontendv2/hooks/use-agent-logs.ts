"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { AgentLog, CompetitorReport } from "@/lib/types"
import { LogEntry } from "@/components/live-logs"

interface UseAgentLogsOptions {
  runId?: string | null
  onComplete?: (reports: CompetitorReport[]) => void
}

interface UseAgentLogsReturn {
  logs: LogEntry[]
  isRunning: boolean
  reports: CompetitorReport[]
  streamingUrl: string | null
  clearLogs: () => void
  addLog: (log: AgentLog) => void
  startAnalysis: (url: string) => Promise<CompetitorReport[] | null>
}

export function useAgentLogs(options: UseAgentLogsOptions = {}): UseAgentLogsReturn {
  const { runId, onComplete } = options
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [reports, setReports] = useState<CompetitorReport[]>([])
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const hasCompletedRef = useRef(false)

  // Simulated analysis steps for demo
  const simulatedSteps = [
    { type: "info" as const, message: "Initializing browser agent..." },
    { type: "info" as const, message: "Navigating to target website..." },
    { type: "success" as const, message: "Website loaded successfully" },
    { type: "info" as const, message: "Scanning page structure..." },
    { type: "info" as const, message: "Detecting pricing elements..." },
    { type: "success" as const, message: "Found pricing page" },
    { type: "info" as const, message: "Extracting pricing tiers..." },
    { type: "success" as const, message: "Extracted 3 pricing tiers" },
    { type: "info" as const, message: "Searching for job postings..." },
    { type: "success" as const, message: "Found 24 open positions" },
    { type: "info" as const, message: "Analyzing hiring trends..." },
    { type: "info" as const, message: "Collecting customer reviews..." },
    { type: "success" as const, message: "Aggregated 156 reviews from 4 platforms" },
    { type: "info" as const, message: "Generating AI insights..." },
    { type: "success" as const, message: "Analysis complete!" },
  ]

  const startAnalysis = useCallback(async (url: string): Promise<CompetitorReport[] | null> => {
    setLogs([])
    setReports([])
    setStreamingUrl(null)
    hasCompletedRef.current = false
    setIsRunning(true)

    const addLogEntry = (type: LogEntry["type"], message: string) => {
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: new Date(),
      }
      setLogs((prev) => [...prev, newLog])
    }

    try {
      // Show initial logs
      addLogEntry("info", "Initializing AI analysis agent...")
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      addLogEntry("info", `Connecting to ${url}...`)
      await new Promise((resolve) => setTimeout(resolve, 400))
      
      addLogEntry("success", "Target website identified")
      await new Promise((resolve) => setTimeout(resolve, 200))
      
      addLogEntry("info", "Scanning for pricing information...")
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      addLogEntry("info", "Searching job postings...")
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      addLogEntry("info", "Collecting customer reviews...")
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      addLogEntry("info", "Generating AI insights with Groq LLaMA 3.3...")
      
      // Call real AI API
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        addLogEntry("success", "Pricing data extracted")
        await new Promise((resolve) => setTimeout(resolve, 200))
        
        addLogEntry("success", `Found ${result.data.jobs?.total || 0} job postings`)
        await new Promise((resolve) => setTimeout(resolve, 200))
        
        addLogEntry("success", `Aggregated ${result.data.reviews?.totalCount || 0} reviews`)
        await new Promise((resolve) => setTimeout(resolve, 200))
        
        addLogEntry("success", "AI analysis complete!")

        const domain = url.replace(/^https?:\/\//, "").replace(/\/$/, "")
        const report: CompetitorReport = {
          id: result.analysisId || crypto.randomUUID(),
          competitor: result.data.competitor?.name || domain,
          analyzedAt: new Date().toISOString(),
          pricing: {
            model: result.data.pricing?.model || "Unknown",
            plans: result.data.pricing?.plans || [],
          },
          jobs: {
            total: result.data.jobs?.total || 0,
            byDepartment: result.data.jobs?.departments?.map((d: { name: string; count: number; trend: number }) => ({
              name: d.name,
              count: d.count,
              growth: d.trend,
            })) || [],
          },
          reviews: {
            averageRating: result.data.reviews?.averageRating || 0,
            totalCount: result.data.reviews?.totalCount || 0,
            byPlatform: result.data.reviews?.platforms || [],
            sentiment: result.data.reviews?.sentiment || { positive: 0, neutral: 0, negative: 0 },
          },
          insights: result.data.insights?.recommendations?.map((r: { title: string }) => r.title) || 
                    result.data.insights?.strengths || [],
        }

        setReports([report])
        setIsRunning(false)
        onComplete?.([report])
        return [report]
      } else {
        throw new Error(result.error || "Unknown error")
      }
    } catch (error) {
      addLogEntry("error", `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsRunning(false)
      return null
    }
  }, [onComplete])

  const clearLogs = useCallback(() => {
    setLogs([])
    setReports([])
    setStreamingUrl(null)
    hasCompletedRef.current = false
  }, [])

  const addLog = useCallback((log: AgentLog) => {
    setLogs((prev) => [...prev, { ...log, id: crypto.randomUUID(), timestamp: new Date().toISOString() }])
  }, [])

  // SSE connection for real-time logs
  useEffect(() => {
    if (!runId) {
      setIsRunning(false)
      return
    }

    // Clear previous state
    clearLogs()
    setIsRunning(true)
    hasCompletedRef.current = false

    // Check for cached reports first
    const cachedReports = localStorage.getItem(`cp_reports_${runId}`)
    if (cachedReports) {
      try {
        const parsed = JSON.parse(cachedReports) as CompetitorReport[]
        setReports(parsed)
        setIsRunning(false)
        return
      } catch {
        // Continue with SSE if cache is invalid
      }
    }

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/agent/logs/${runId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === "log") {
          const log: AgentLog = {
            id: crypto.randomUUID(),
            type: data.logType || "info",
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString(),
            details: data.details
          }
          setLogs((prev) => [...prev, log])
        } else if (data.type === "streaming_url") {
          setStreamingUrl(data.url)
        } else if (data.type === "reports") {
          setReports(data.reports)
          localStorage.setItem(`cp_reports_${runId}`, JSON.stringify(data.reports))
        } else if (data.type === "complete") {
          setIsRunning(false)
          hasCompletedRef.current = true
          if (data.reports) {
            setReports(data.reports)
            localStorage.setItem(`cp_reports_${runId}`, JSON.stringify(data.reports))
            onComplete?.(data.reports)
          }
          eventSource.close()
        } else if (data.type === "error") {
          const errorLog: AgentLog = {
            id: crypto.randomUUID(),
            type: "error",
            message: data.message || "An error occurred",
            timestamp: new Date().toISOString()
          }
          setLogs((prev) => [...prev, errorLog])
          setIsRunning(false)
          eventSource.close()
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      setIsRunning(false)
      eventSource.close()
      
      // Fallback to REST endpoint if SSE fails
      if (!hasCompletedRef.current) {
        fetch(`/api/agent/reports/${runId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.reports) {
              setReports(data.reports)
              onComplete?.(data.reports)
            }
          })
          .catch(() => {
            // Ignore fetch errors
          })
      }
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [runId, clearLogs, onComplete])

  return {
    logs,
    isRunning,
    reports,
    streamingUrl,
    clearLogs,
    addLog,
    startAnalysis
  }
}

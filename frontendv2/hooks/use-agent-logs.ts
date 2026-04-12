"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { LogEntry } from "@/components/live-logs"
import { startAgent, createLogStream, fetchRunReports } from "@/lib/api"

/* ── localStorage cache ── */
function getCachedReports(runId: string): any[] | null {
  try { const raw = localStorage.getItem(`cp_reports_${runId}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function cacheReports(runId: string, reports: any[]) {
  try { localStorage.setItem(`cp_reports_${runId}`, JSON.stringify(reports)); } catch { /* quota */ }
}

const ACTIVE_HOME_RUN_KEY = "cp_active_home_run"

export function useAgentLogs(runIdProp: string | null = null) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  /* ── Subscribe to SSE when a runId is given (or obtained via startAnalysis) ── */
  const connectSSE = useCallback((runId: string) => {
    setLogs([])
    setIsRunning(true)
    setReports([])
    setActiveRunId(runId)
    try { localStorage.setItem(ACTIVE_HOME_RUN_KEY, runId) } catch {}

    const cached = getCachedReports(runId)
    if (cached && cached.length > 0) setReports(cached)

    const es = createLogStream(
      runId,
      (data) => {
        if (data.message) {
          setLogs((prev) => [...prev, {
            id: crypto.randomUUID(),
            type: data.level || data.type || "info",
            message: data.message,
            timestamp: new Date(),
          }])
        }
      },
      async (incomingReports) => {
        setIsRunning(false)
        setActiveRunId(null)
        try { localStorage.removeItem(ACTIVE_HOME_RUN_KEY) } catch {}
        if (incomingReports && incomingReports.length > 0) {
          setReports(incomingReports)
          cacheReports(runId, incomingReports)
        } else {
          try {
            const res = await fetchRunReports(runId)
            if (res.success && res.reports?.length > 0) {
              setReports(res.reports)
              cacheReports(runId, res.reports)
            }
          } catch { /* ignore */ }
        }
      }
    )
    esRef.current = es
  }, [])

  /* ── Auto-connect if a prop runId is provided (handles page refresh) ── */
  useEffect(() => {
    if (!runIdProp) return
    connectSSE(runIdProp)
    return () => { esRef.current?.close() }
  }, [runIdProp, connectSSE])

  /* ── Auto-restore from localStorage on mount (page refresh recovery) ── */
  useEffect(() => {
    if (runIdProp) return
    const savedRunId = (() => { try { return localStorage.getItem(ACTIVE_HOME_RUN_KEY) } catch { return null } })()
    if (!savedRunId) return

    let cancelled = false
    fetchRunReports(savedRunId).then(res => {
      if (cancelled) return
      if (!res.success) {
        try { localStorage.removeItem(ACTIVE_HOME_RUN_KEY) } catch {}
        return
      }
      if (!res.done) {
        connectSSE(savedRunId)
      } else {
        try { localStorage.removeItem(ACTIVE_HOME_RUN_KEY) } catch {}
        if (res.reports?.length > 0) {
          setReports(res.reports)
          cacheReports(savedRunId, res.reports)
        }
      }
    }).catch(() => {
      try { localStorage.removeItem(ACTIVE_HOME_RUN_KEY) } catch {}
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Start a full analysis from the home page ── */
  const startAnalysis = useCallback(async (url: string, opts?: { tasks?: string[]; maxCompetitors?: number }) => {
    setLogs([])
    setReports([])
    setIsRunning(true)

    let filters: Record<string, any> = {}
    try { filters = JSON.parse(localStorage.getItem("cp_filters") || "{}") } catch {}
    if (opts?.tasks && opts.tasks.length > 0) filters.tasks = opts.tasks
    if (opts?.maxCompetitors !== undefined) filters.maxCompetitors = opts.maxCompetitors

    try {
      const data = await startAgent(url, filters)
      if (!data.success || !data.runId) {
        setLogs([{ id: crypto.randomUUID(), type: "error", message: data.error || "Failed to start agent", timestamp: new Date() }])
        setIsRunning(false)
        return null
      }
      connectSSE(data.runId)
      return data.runId
    } catch (err) {
      setLogs([{ id: crypto.randomUUID(), type: "error", message: `Agent start failed: ${err instanceof Error ? err.message : "Unknown"}`, timestamp: new Date() }])
      setIsRunning(false)
      return null
    }
  }, [connectSSE])

  const clearLogs = useCallback(() => { setLogs([]); setReports([]); setActiveRunId(null) }, [])

  return { logs, isRunning, reports, activeRunId, clearLogs, startAnalysis }
}

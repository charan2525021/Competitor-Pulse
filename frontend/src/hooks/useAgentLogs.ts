import { useState, useEffect, useRef } from "react";
import { createLogStream, fetchRunReports } from "../services/api";

export interface LogEntry {
  type: "log" | "error" | "complete";
  message: string;
  timestamp: string;
}

/* ── localStorage cache for reports ── */
function getCachedReports(runId: string): any[] | null {
  try {
    const raw = localStorage.getItem(`cp_reports_${runId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function cacheReports(runId: string, reports: any[]) {
  try { localStorage.setItem(`cp_reports_${runId}`, JSON.stringify(reports)); } catch { /* quota */ }
}

export function useAgentLogs(runId: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId) return;

    // On reconnect (page refresh), don't clear logs — let them replay from backend
    setLogs([]);
    setIsRunning(true);
    setReports([]);

    // Check localStorage cache — use as initial reports while SSE connects
    const cached = getCachedReports(runId);
    if (cached && cached.length > 0) {
      setReports(cached);
    } else {
      setReports([]);
    }

    const es = createLogStream(
      runId,
      (data) => {
        setLogs((prev) => [
          ...prev,
          { ...data, timestamp: new Date().toISOString() },
        ]);
      },
      async (incomingReports) => {
        setIsRunning(false);
        if (incomingReports && incomingReports.length > 0) {
          setReports(incomingReports);
          cacheReports(runId, incomingReports);
        } else {
          // Fallback: fetch reports via REST if SSE didn't deliver them
          try {
            const res = await fetchRunReports(runId);
            if (res.success && res.reports?.length > 0) {
              setReports(res.reports);
              cacheReports(runId, res.reports);
            }
          } catch { /* ignore */ }
          // If REST also failed, cached reports (set above) remain
        }
      }
    );

    esRef.current = es;
    return () => es.close();
  }, [runId]);

  const clearLogs = () => {
    setLogs([]);
    setReports([]);
  };

  return { logs, isRunning, reports, clearLogs };
}

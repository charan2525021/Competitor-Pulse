import { useState, useEffect, useRef } from "react";
import { ChatInput } from "../components/ChatInput";
import { LiveLogs } from "../components/LiveLogs";
import { SettingsPanel, type Filters } from "../components/SettingsPanel";
import { HistoryList, type HistoryItem } from "../components/HistoryList";
import { CompetitorCard } from "../components/CompetitorCard";
import { useAgentLogs } from "../hooks/useAgentLogs";
import { startAgent, cancelAgent } from "../services/api";
import { AIParticles } from "../components/FishAnimation";
import {
  PanelRightClose, PanelRightOpen, Clock, Cpu, Radar, StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HomeProps {
  runId: string | null;
  setRunId: (id: string | null) => void;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onReportsReady: (reports: any[]) => void;
  onDeleteHistory: (runId: string) => void;
  isAdmin?: boolean;
}

export function Home({ runId, setRunId, history, setHistory, filters, setFilters, onReportsReady, onDeleteHistory, isAdmin }: HomeProps) {
  const [rightOpen, setRightOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"history" | "config">("history");
  const [showReports, setShowReports] = useState(false);

  const { logs, isRunning, reports } = useAgentLogs(runId);
  const llm = filters.llm || { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "" };
  const tfKey = filters.tinyfishApiKey || "";
  const hasTfKey = !!tfKey;
  const hasLlmKey = !!llm.apiKey;
  const inputMode: "smart" | "urls-only" = (hasTfKey && hasLlmKey) ? "smart" : hasTfKey ? "urls-only" : "smart";

  const getValidationError = (): string | null => {
    if (!hasTfKey) return "TinyFish API key is required. Click Settings in the top bar to add it.";
    return null;
  };

  const [pushedSet] = useState<Set<string>>(() => {
    try { const r = localStorage.getItem("cp_intel_pushed"); return r ? new Set(JSON.parse(r) as string[]) : new Set<string>(); } catch { return new Set<string>(); }
  });

  const handleSend = async (prompt: string) => {
    if (getValidationError()) return;
    try {
      setShowReports(false);
      const result = await startAgent(prompt, filters);
      if (result.success) {
        setRunId(result.runId);
        setHistory((prev) => [{ runId: result.runId, prompt, timestamp: new Date().toISOString(), status: "running" as const }, ...prev]);
      }
    } catch (err) { console.error("Failed to start agent:", err); }
  };

  const handleSendUrls = async (urls: string[]) => {
    if (getValidationError()) return;
    const prompt = `Analyze: ${urls.join(", ")}`;
    try {
      setShowReports(false);
      const result = await startAgent(prompt, { ...filters, directUrls: urls });
      if (result.success) {
        setRunId(result.runId);
        setHistory((prev) => [{ runId: result.runId, prompt: `URLs: ${urls.join(", ")}`, timestamp: new Date().toISOString(), status: "running" as const }, ...prev]);
      }
    } catch (err) { console.error("Failed:", err); }
  };

  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (!runId) return;
    const justFinished = wasRunningRef.current && !isRunning;
    wasRunningRef.current = isRunning;
    if (justFinished) {
      setHistory((prev) => prev.map((h) => h.runId === runId && h.status === "running" ? { ...h, status: "done" as const } : h));
      if (reports.length > 0) {
        setShowReports(true);
        if (!pushedSet.has(runId)) { pushedSet.add(runId); try { localStorage.setItem("cp_intel_pushed", JSON.stringify([...pushedSet])); } catch {} onReportsReady(reports); }
      }
    }
  }, [isRunning, runId, setHistory, reports, onReportsReady]);

  return (
    <div className="flex h-full">
      {/* ── Main Content ── */}
      <main className="relative flex-1 flex flex-col p-6 gap-4 overflow-y-auto page-enter min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Radar size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">Agent</h1>
            <p className="text-xs text-muted-foreground">Autonomous competitive intelligence</p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {isRunning && runId && (
              <Button onClick={async () => { try { await cancelAgent(runId); } catch {} }}
                className="flex items-center gap-1.5 rounded-full text-xs font-medium hover:scale-105"
                size="sm"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}>
                <StopCircle size={14} /> Stop
              </Button>
            )}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              !isRunning && !runId && "bg-muted text-muted-foreground"
            )}
              style={isRunning ? { backgroundColor: "rgba(234,179,8,0.15)", color: "#eab308" } : runId ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" } : undefined}>
              <span className={cn(
                  "w-2 h-2 rounded-full",
                  isRunning && "animate-pulse-dot",
                  !isRunning && !runId && "bg-muted-foreground"
                )}
                style={isRunning ? { backgroundColor: "#eab308" } : runId ? { backgroundColor: "#22c55e" } : undefined} />
              {isRunning ? "Scanning" : runId ? "Complete" : "Idle"}
            </div>
            {/* Right panel toggle */}
            <Button onClick={() => setRightOpen(!rightOpen)}
              variant="outline"
              size="icon"
              className={cn(
                "rounded-xl transition-all hover:scale-110",
                rightOpen ? "bg-primary/10 text-primary border-primary" : "bg-muted text-muted-foreground border-border"
              )}>
              {rightOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </Button>
          </div>
        </div>

        {/* Chat Input */}
        <ChatInput onSend={handleSend} onSendUrls={handleSendUrls} disabled={isRunning} mode={inputMode} validationError={getValidationError()} />

        {/* Toggle logs/reports */}
        {reports.length > 0 && !isRunning && (
          <div className="flex gap-2 p-1 rounded-xl self-start bg-muted">
            <TabBtn active={!showReports} onClick={() => setShowReports(false)} color="#6366f1">Live Logs</TabBtn>
            <TabBtn active={showReports} onClick={() => setShowReports(true)} color="#8b5cf6">Intel Reports ({reports.length})</TabBtn>
          </div>
        )}

        {/* Content */}
        {showReports ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {reports.map((r, i) => <CompetitorCard key={r.company + i} report={r} index={i} />)}
          </div>
        ) : logs.length > 0 || isRunning ? (
          <LiveLogs logs={logs} isRunning={isRunning} />
        ) : (
          <div className="relative flex-1 flex flex-col items-center justify-center gap-2">
            <AIParticles count={10} />
            <p className="text-sm font-medium text-muted-foreground">
              Enter a query to start your competitive intelligence scan
            </p>
          </div>
        )}
      </main>

      {/* ── Right Panel (History + Config) ── */}
      {rightOpen && (
        <aside className="w-80 shrink-0 border-l border-border flex flex-col animate-slide-right bg-sidebar">
          {/* Tabs */}
          <div className="flex gap-1 p-2 shrink-0 border-b border-border">
            <button onClick={() => setRightTab("history")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                rightTab === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
              <Clock size={13} /> History
            </button>
            <button onClick={() => setRightTab("config")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                rightTab === "config" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
              <Cpu size={13} /> Config
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === "history" ? (
              <HistoryList items={history} activeRunId={runId}
                onSelect={(id) => { setRunId(id); setShowReports(false); }}
                onDelete={onDeleteHistory} isAdmin={isAdmin} />
            ) : (
              <SettingsPanel filters={filters} onChange={setFilters} mode="agent-only" />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "text-xs px-4 py-1.5 rounded-lg font-medium transition-all",
      !active && "text-muted-foreground"
    )}
      style={{
        background: active ? `linear-gradient(135deg, ${color}, ${color}dd)` : "transparent",
        color: active ? "#fff" : undefined,
        boxShadow: active ? `0 2px 8px ${color}30` : "none",
      }}>
      {children}
    </button>
  );
}

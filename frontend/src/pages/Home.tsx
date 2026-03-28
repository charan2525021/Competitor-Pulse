import { useState, useEffect, useRef } from "react";
import { ChatInput } from "../components/ChatInput";
import { LiveLogs } from "../components/LiveLogs";
import { SettingsPanel, type Filters } from "../components/SettingsPanel";
import { HistoryList, type HistoryItem } from "../components/HistoryList";
import { CompetitorCard } from "../components/CompetitorCard";
import { useAgentLogs } from "../hooks/useAgentLogs";
import { startAgent, cancelAgent } from "../services/api";
import {
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Clock, Cpu, Eye, Lock, Settings, Radar, StopCircle, Brain, Key, Users, Fish,
} from "lucide-react";

interface HomeProps {
  runId: string | null;
  setRunId: (id: string | null) => void;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onReportsReady: (reports: any[]) => void;
  onDeleteHistory: (runId: string) => void;
}

export function Home({
  runId, setRunId, history, setHistory, filters, setFilters,
  onReportsReady, onDeleteHistory,
}: HomeProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftHover, setLeftHover] = useState(false);
  const [rightHover, setRightHover] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [scrollToSection, setScrollToSection] = useState<string | null>(null);

  const openRightTo = (section: string) => {
    setRightOpen(true);
    setScrollToSection(section);
    // Clear after a tick so it can re-trigger
    setTimeout(() => setScrollToSection(null), 500);
  };

  const { logs, isRunning, reports } = useAgentLogs(runId);
  const llm = filters.llm || { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "" };
  const tfKey = filters.tinyfishApiKey || "";

  // Determine input mode based on which keys are set
  const hasTfKey = !!tfKey;
  const hasLlmKey = !!llm.apiKey;
  const inputMode: "smart" | "urls-only" = (hasTfKey && hasLlmKey) ? "smart" : hasTfKey ? "urls-only" : "smart";

  // Validation error
  const getValidationError = (): string | null => {
    if (!hasTfKey) return "TinyFish API key is required to run the web agent. Open settings (right panel) and enter your TinyFish API key.";
    return null;
  };
  const validationError = getValidationError();
  // Track which runIds we already pushed to intel store.
  // Persist the set so refreshes don't re-push duplicates.
  const [pushedSet] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("cp_intel_pushed");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const handleSend = async (prompt: string) => {
    if (validationError) return;
    try {
      setShowReports(false);
      const result = await startAgent(prompt, filters);
      if (result.success) {
        setRunId(result.runId);
        setHistory((prev) => [
          { runId: result.runId, prompt, timestamp: new Date().toISOString(), status: "running" as const },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Failed to start agent:", err);
    }
  };

  const handleSendUrls = async (urls: string[]) => {
    if (validationError) return;
    // Build a prompt that includes the URLs directly so the orchestrator uses them
    const prompt = `Analyze these competitor websites: ${urls.join(", ")}`;
    // Override the plan to use these exact URLs
    const filtersWithUrls = { ...filters, directUrls: urls };
    try {
      setShowReports(false);
      const result = await startAgent(prompt, filtersWithUrls);
      if (result.success) {
        setRunId(result.runId);
        setHistory((prev) => [
          { runId: result.runId, prompt: `URLs: ${urls.join(", ")}`, timestamp: new Date().toISOString(), status: "running" as const },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Failed to start agent:", err);
    }
  };

  // Track previous isRunning to detect running → done transitions
  const wasRunningRef = useRef(false);

  useEffect(() => {
    if (!runId) return;

    // Detect transition from running → done
    const justFinished = wasRunningRef.current && !isRunning;
    wasRunningRef.current = isRunning;

    if (justFinished) {
      setHistory((prev) => {
        const item = prev.find((h) => h.runId === runId);
        if (item && item.status === "running") {
          return prev.map((h) => (h.runId === runId ? { ...h, status: "done" as const } : h));
        }
        return prev;
      });
      if (reports.length > 0) {
        setShowReports(true);
        // Push reports to intel store (only once per runId, persisted across refreshes)
        if (!pushedSet.has(runId)) {
          pushedSet.add(runId);
          try { localStorage.setItem("cp_intel_pushed", JSON.stringify([...pushedSet])); } catch { /* quota */ }
          onReportsReady(reports);
        }
      }
    }
  }, [isRunning, runId, setHistory, reports, onReportsReady]);

  return (
    <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
      {/* Left Sidebar */}
      <aside
        className="border-r overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
        style={{ width: leftOpen ? 288 : 56, minWidth: leftOpen ? 288 : 56, backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center p-2" style={{ justifyContent: leftOpen ? "flex-end" : "center" }}>
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            onMouseEnter={() => setLeftHover(true)}
            onMouseLeave={() => setLeftHover(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: leftHover ? "var(--accent-soft)" : "var(--bg-card)",
              border: `1.5px solid ${leftHover ? "var(--accent)" : "var(--border)"}`,
              color: leftHover ? "var(--accent)" : "var(--text-secondary)",
              boxShadow: leftHover ? "0 0 12px rgba(59,130,246,0.2)" : "var(--shadow-sm)",
              transform: leftHover ? "scale(1.1)" : "scale(1)",
            }}
            title={leftOpen ? "Collapse history" : "Expand history"}
          >
            {leftOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>
        {leftOpen ? (
          <div className="flex-1 overflow-y-auto px-3 pb-4 animate-fade-in">
            <HistoryList items={history} activeRunId={runId} onSelect={(id) => { setRunId(id); setShowReports(false); }} onDelete={onDeleteHistory} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 pt-2 px-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-default"
              style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }} title="Scan History">
              <Clock size={18} />
            </div>
            {history.slice(0, 8).map((item) => {
              const isActive = item.runId === runId;
              const dotColor = item.status === "running" ? "#eab308" : item.status === "done" ? "#22c55e" : "#ef4444";
              return (
                <button key={item.runId} onClick={() => { setRunId(item.runId); setLeftOpen(true); setShowReports(false); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 relative"
                  style={{ backgroundColor: isActive ? "var(--accent-soft)" : "var(--bg-card)", border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}` }}
                  title={item.prompt}
                >
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>#{history.indexOf(item) + 1}</span>
                  <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${item.status === "running" ? "animate-pulse-dot" : ""}`}
                    style={{ backgroundColor: dotColor, borderColor: "var(--bg-sidebar)" }} />
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Center */}
      <main className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto animate-fade-in min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}>
            <Radar size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>CompetitorPulse</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Powered by TinyFish · Autonomous competitive intelligence agent
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {isRunning && runId && (
              <button
                onClick={async () => { try { await cancelAgent(runId); } catch (e) { console.error(e); } }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
                }}
                title="Stop agent"
              >
                <StopCircle size={14} /> Stop
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: isRunning ? "rgba(234,179,8,0.15)" : runId ? "rgba(34,197,94,0.15)" : "var(--bg-input)",
                color: isRunning ? "#eab308" : runId ? "#22c55e" : "var(--text-muted)",
              }}
            >
              <span className={`w-2 h-2 rounded-full ${isRunning ? "animate-pulse-dot" : ""}`}
                style={{ backgroundColor: isRunning ? "#eab308" : runId ? "#22c55e" : "var(--text-muted)" }} />
              {isRunning ? "Scanning" : runId ? "Complete" : "Idle"}
            </div>
          </div>
        </div>

        <ChatInput
          onSend={handleSend}
          onSendUrls={handleSendUrls}
          disabled={isRunning}
          mode={inputMode}
          validationError={validationError}
          onFixKeys={() => openRightTo("tinyfish")}
        />

        {/* Toggle between logs and reports */}
        {reports.length > 0 && !isRunning && (
          <div className="flex gap-2 p-1 rounded-xl self-start" style={{ backgroundColor: "var(--bg-input)" }}>
            <button
              onClick={() => setShowReports(false)}
              className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all duration-200"
              style={{
                background: !showReports ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "transparent",
                color: !showReports ? "#fff" : "var(--text-secondary)",
                boxShadow: !showReports ? "0 2px 8px rgba(59,130,246,0.3)" : "none",
              }}
            >
              Live Logs
            </button>
            <button
              onClick={() => setShowReports(true)}
              className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all duration-200"
              style={{
                background: showReports ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
                color: showReports ? "#fff" : "var(--text-secondary)",
                boxShadow: showReports ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
              }}
            >
              Intel Reports ({reports.length})
            </button>
          </div>
        )}

        {showReports ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {reports.map((report, i) => (
              <CompetitorCard key={report.company + i} report={report} index={i} />
            ))}
          </div>
        ) : (
          <LiveLogs logs={logs} isRunning={isRunning} />
        )}
      </main>

      {/* Right Sidebar — Settings only (Intel moved to /intel page) */}
      <aside
        className="border-l overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
        style={{ width: rightOpen ? 340 : 56, minWidth: rightOpen ? 340 : 56, backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center p-2" style={{ justifyContent: rightOpen ? "flex-start" : "center" }}>
          <button
            onClick={() => setRightOpen(!rightOpen)}
            onMouseEnter={() => setRightHover(true)}
            onMouseLeave={() => setRightHover(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: rightHover ? "var(--accent-soft)" : "var(--bg-card)",
              border: `1.5px solid ${rightHover ? "var(--accent)" : "var(--border)"}`,
              color: rightHover ? "var(--accent)" : "var(--text-secondary)",
              boxShadow: rightHover ? "0 0 12px rgba(59,130,246,0.2)" : "var(--shadow-sm)",
              transform: rightHover ? "scale(1.1)" : "scale(1)",
            }}
            title={rightOpen ? "Collapse panel" : "Expand panel"}
          >
            {rightOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
          {rightOpen && (
            <span className="ml-2 text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
              <Settings size={12} /> Config
            </span>
          )}
        </div>
        {rightOpen ? (
          <div className="flex-1 overflow-y-auto px-4 pb-4 animate-fade-in">
            <SettingsPanel filters={filters} onChange={setFilters} scrollToSection={scrollToSection} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center gap-3 pt-2 px-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
              title="LLM Settings" onClick={() => openRightTo("llm")}>
              <Brain size={18} />
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", color: "#ef4444" }}
              title={llm.apiKey ? "API Key ✓" : "API Key (not set)"}
              onClick={() => openRightTo("llm")}>
              <Key size={16} />
              {llm.apiKey && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />}
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 relative"
              style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", color: "#0ea5e9" }}
              title={tfKey ? "TinyFish Key ✓" : "TinyFish Key (not set)"}
              onClick={() => openRightTo("tinyfish")}>
              <Fish size={16} />
              {tfKey && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />}
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)" }}
              title={`Max Competitors: ${filters.maxCompetitors}`}
              onClick={() => openRightTo("competitors")}>
              <span style={{ color: "var(--accent)" }} className="font-bold text-xs">{filters.maxCompetitors}</span>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", color: "#06b6d4" }}
              title={`Intel Tasks: ${filters.tasks.length} active`}
              onClick={() => openRightTo("tasks")}>
              <Cpu size={16} />
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", color: "#6366f1" }}
              title={`Mode: ${filters.executionMode}`}
              onClick={() => openRightTo("mode")}>
              {filters.executionMode === "visible" ? <Eye size={16} /> : <Lock size={16} />}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

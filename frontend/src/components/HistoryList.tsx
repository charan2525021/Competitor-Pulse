import { Clock, Trash2 } from "lucide-react";

interface HistoryItem {
  runId: string;
  prompt: string;
  timestamp: string;
  status: "running" | "done" | "error";
}

interface HistoryListProps {
  items: HistoryItem[];
  activeRunId: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
}

export function HistoryList({ items, activeRunId, onSelect, onDelete }: HistoryListProps) {
  const sc = {
    running: { color: "#eab308", label: "Running" },
    done: { color: "#22c55e", label: "Done" },
    error: { color: "#ef4444", label: "Error" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={14} style={{ color: "var(--text-muted)" }} />
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Run History</h2>
      </div>
      {items.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
          <Clock size={28} style={{ opacity: 0.2, margin: "0 auto 8px" }} />
          <p className="text-xs">No runs yet</p>
        </div>
      )}
      {items.map((item, i) => {
        const isActive = activeRunId === item.runId;
        const s = sc[item.status];
        return (
          <button
            key={item.runId}
            onClick={() => onSelect(item.runId)}
            className="w-full text-left p-3 rounded-2xl transition-all duration-200 animate-fade-in hover:-translate-y-0.5"
            style={{
              animationDelay: `${i * 50}ms`,
              backgroundColor: isActive ? "var(--accent-soft)" : "var(--bg-card)",
              border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
              boxShadow: isActive ? "0 0 0 3px var(--accent-soft)" : "var(--shadow-sm)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === "running" ? "animate-pulse-dot" : ""}`} style={{ backgroundColor: s.color }} />
              <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
              <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onDelete(item.runId); }}
                className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-125"
                style={{ color: "#ef4444", opacity: 0.5 }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                title="Delete"
              >
                <Trash2 size={11} />
              </span>
            </div>
            <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.prompt}</p>
          </button>
        );
      })}
    </div>
  );
}

export type { HistoryItem };

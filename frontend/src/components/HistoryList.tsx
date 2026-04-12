import { Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  isAdmin?: boolean;
}

export function HistoryList({ items, activeRunId, onSelect, onDelete, isAdmin }: HistoryListProps) {
  const sc = {
    running: { color: "#eab308", label: "Running" },
    done: { color: "#22c55e", label: "Done" },
    error: { color: "#ef4444", label: "Error" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Run History</h2>
      </div>
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock size={28} className="opacity-20 mx-auto mb-2" />
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
            className={cn(
              "w-full text-left p-3 rounded-2xl transition-all duration-200 animate-fade-in hover:-translate-y-0.5 border",
              isActive ? "bg-primary/10 border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]" : "bg-card border-border shadow-sm"
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === "running" ? "animate-pulse-dot" : ""}`} style={{ backgroundColor: s.color }} />
              <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
              <span className="text-xs ml-auto text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
              <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(item.runId); }}
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-125 text-rose-500 opacity-50 hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </span>
            </div>
            <p className="text-sm truncate text-foreground">{item.prompt}</p>
          </button>
        );
      })}
    </div>
  );
}

export type { HistoryItem };

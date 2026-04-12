import { useState } from "react";
import { PanelRightClose, PanelRightOpen, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface HistoryPanelItem {
  id: string;
  label: string;
  sublabel?: string;
  timestamp: string;
  status: "running" | "done" | "success" | "failed" | "complete" | "error";
  badge?: { text: string; color: string };
}

interface HistoryPanelProps {
  title: string;
  color: string;
  icon: React.ReactNode;
  items: HistoryPanelItem[];
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  running: "#eab308",
  done: "#22c55e",
  success: "#22c55e",
  complete: "#22c55e",
  failed: "#ef4444",
  error: "#ef4444",
};

export function HistoryPanel({ title, color, icon, items, onSelect, onDelete, children }: HistoryPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>

      {/* Collapsed strip */}
      {!open && (
        <div className="shrink-0 border-l border-border flex flex-col items-center py-3 px-1 bg-sidebar">
          <Button
            onClick={() => setOpen(true)}
            variant="ghost"
            size="icon"
            className="rounded-xl hover:scale-110 transition-all"
            title={`Open ${title}`}
          >
            <PanelRightOpen size={16} className="text-muted-foreground" />
          </Button>
          {items.length > 0 && (
            <div
              className="mt-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {items.length}
            </div>
          )}
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <aside className="w-72 shrink-0 border-l border-border flex flex-col animate-slide-right bg-sidebar">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-3 shrink-0 border-b border-border">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
              {title}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {items.length}
            </span>
            <Button
              onClick={() => setOpen(false)}
              variant="ghost"
              size="icon"
              className="rounded-xl h-7 w-7 hover:scale-110 transition-all"
            >
              <PanelRightClose size={14} className="text-muted-foreground" />
            </Button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Clock size={20} className="mb-2 opacity-50" />
                <p className="text-xs">No history yet</p>
              </div>
            ) : (
              items.map((item) => {
                const dotColor = STATUS_COLORS[item.status] || "#6b7280";
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 rounded-xl text-xs transition-all duration-200 group",
                      "bg-muted border border-border hover:border-primary/30",
                      onSelect && "cursor-pointer"
                    )}
                    onClick={() => onSelect?.(item.id)}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0 mt-1",
                        item.status === "running" && "animate-pulse-dot"
                      )}
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0"
                            style={{
                              backgroundColor: `${item.badge.color}15`,
                              color: item.badge.color,
                            }}
                          >
                            {item.badge.text}
                          </span>
                        )}
                        <span
                          className="font-medium truncate text-foreground"
                          title={item.label}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.sublabel && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {item.sublabel}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shrink-0"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

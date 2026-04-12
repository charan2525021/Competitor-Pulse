import { useState } from "react";
import { Send, Loader2, Sparkles, Globe, Plus, X, AlertTriangle, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (prompt: string) => void;
  onSendUrls?: (urls: string[], tasks: string[]) => void;
  disabled?: boolean;
  mode: "smart" | "urls-only";
  validationError?: string | null;
  onFixKeys?: () => void;
}

export function ChatInput({ onSend, onSendUrls, disabled, mode, validationError, onFixKeys }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [urls, setUrls] = useState<string[]>([""]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "urls-only") {
      const validUrls = urls.filter((u) => u.trim()).map((u) => {
        const t = u.trim();
        return t.startsWith("http") ? t : `https://${t}`;
      });
      if (validUrls.length > 0 && onSendUrls) {
        onSendUrls(validUrls, []);
        setUrls([""]);
      }
    } else {
      if (value.trim() && !disabled) {
        onSend(value.trim());
        setValue("");
      }
    }
  };

  const addUrl = () => setUrls((p) => [...p, ""]);
  const removeUrl = (i: number) => setUrls((p) => p.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, v: string) => setUrls((p) => p.map((u, idx) => idx === i ? v : u));

  // Validation error banner
  if (validationError) {
    return (
      <div className="rounded-2xl p-4 flex items-start gap-3 animate-scale-in"
        style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)" }}>
        <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "#ef4444" }}>API Keys Required</p>
          <p className="text-xs mt-1 text-muted-foreground">{validationError}</p>
        </div>
        {onFixKeys && (
          <button onClick={onFixKeys}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all hover:scale-105 text-primary"
            style={{ backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <Key size={12} /> Set Keys
          </button>
        )}
      </div>
    );
  }

  // URL-only mode (TinyFish key only, no LLM)
  if (mode === "urls-only") {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-2xl p-4 bg-card border-[1.5px] border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">
              Enter competitor URLs directly
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
              No LLM key — URL mode
            </span>
          </div>
          <div className="space-y-2">
            {urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={url} onChange={(e) => updateUrl(i, e.target.value)}
                  placeholder="https://slack.com"
                  disabled={disabled}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none bg-muted border-[1.5px] border-border text-foreground focus:border-primary"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (i === urls.length - 1) addUrl(); } }}
                />
                {urls.length > 1 && (
                  <button type="button" onClick={() => removeUrl(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all hover:scale-110"
                    style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.08)" }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={addUrl}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 bg-primary/10 text-primary">
              <Plus size={12} /> Add URL
            </button>
            <div className="flex-1" />
            <Button type="submit" disabled={disabled || urls.every((u) => !u.trim())}
              className="gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 12px rgba(99,102,241,0.4)" }}>
              {disabled ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {disabled ? "Scanning..." : "Analyze"}
            </Button>
          </div>
        </div>
        <p className="text-[10px] px-1 text-muted-foreground">
          Add an LLM API key in settings to use natural language queries instead of URLs
        </p>
      </form>
    );
  }

  // Smart mode (both keys set)
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "flex items-center gap-3 rounded-2xl transition-all duration-300 bg-card border-[1.5px] p-1.5 pl-5",
        focused ? "border-primary ring-4 ring-primary/10 shadow-md" : "border-border shadow-sm"
      )}>
        <Sparkles size={16} className={cn("shrink-0 transition-colors duration-200", focused ? "text-primary" : "text-muted-foreground")} />
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Analyze Slack, Notion, and Monday.com — pricing, jobs, reviews..."
          disabled={disabled}
          className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50 min-w-0 text-foreground" />
        <Button type="submit" disabled={disabled || !value.trim()}
          className="gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          style={{
            background: disabled ? "var(--text-muted)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: disabled || !value.trim() ? "none" : "0 2px 12px rgba(99,102,241,0.4)",
          }}>
          {disabled ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {disabled ? "Scanning..." : "Analyze"}
        </Button>
      </div>
    </form>
  );
}

import { useState } from "react";
import {
  DollarSign, Briefcase, Star, FileText, Cpu, Share2,
  Trash2, ExternalLink, ChevronRight, Database,
} from "lucide-react";

export interface IntelRecord {
  id: string;
  company: string;
  scanDate: string;
  type: "pricing" | "jobs" | "reviews" | "blog" | "features" | "social" | "leads" | "forms";
  data: any;
}

interface IntelDataPanelProps {
  records: IntelRecord[];
  onDelete: (id: string) => void;
}

const TABS = [
  { id: "pricing" as const, label: "Pricing", icon: <DollarSign size={14} />, color: "#22c55e" },
  { id: "jobs" as const, label: "Jobs", icon: <Briefcase size={14} />, color: "#3b82f6" },
  { id: "reviews" as const, label: "Reviews", icon: <Star size={14} />, color: "#f59e0b" },
  { id: "blog" as const, label: "Blog", icon: <FileText size={14} />, color: "#8b5cf6" },
  { id: "features" as const, label: "Features", icon: <Cpu size={14} />, color: "#06b6d4" },
  { id: "social" as const, label: "Social", icon: <Share2 size={14} />, color: "#ec4899" },
  { id: "leads" as const, label: "Leads", icon: <Briefcase size={14} />, color: "#f59e0b" },
  { id: "forms" as const, label: "Forms", icon: <FileText size={14} />, color: "#6366f1" },
];

export function IntelDataPanel({ records, onDelete }: IntelDataPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("pricing");

  const filtered = records.filter((r) => r.type === activeTab);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#fff" }}>
          <Database size={15} />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Intel Data
        </h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
          {records.length}
        </span>
      </div>

      {/* Tab strip */}
      <div className="flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const count = records.filter((r) => r.type === tab.id).length;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
              style={{
                backgroundColor: active ? `${tab.color}15` : "transparent",
                border: `1.5px solid ${active ? `${tab.color}40` : "transparent"}`,
                color: active ? tab.color : "var(--text-muted)",
              }}
            >
              {tab.icon}
              <span className="hidden xl:inline">{tab.label}</span>
              {count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: `${tab.color}20`, color: tab.color }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          filtered.map((rec) => (
            <RecordRow key={rec.id} record={rec} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

function RecordRow({ record, onDelete }: { record: IntelRecord; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const tab = TABS.find((t) => t.id === record.type);
  const color = tab?.color || "#3b82f6";

  return (
    <div className="rounded-xl transition-all duration-200"
      style={{ backgroundColor: "var(--bg-input)", border: `1px solid var(--border)` }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <span className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15`, color }}>{tab?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {record.company}
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {new Date(record.scanDate).toLocaleDateString()}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
          className="w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-110"
          style={{ color: "#ef4444" }} title="Delete">
          <Trash2 size={12} />
        </button>
        <ChevronRight size={12} style={{
          color: "var(--text-muted)",
          transform: expanded ? "rotate(90deg)" : "rotate(0)",
          transition: "transform 0.2s ease",
        }} />
      </div>
      {expanded && (
        <div className="px-3 pb-3 animate-fade-in">
          <RecordDetail record={record} />
        </div>
      )}
    </div>
  );
}

function RecordDetail({ record }: { record: IntelRecord }) {
  const { type, data } = record;

  if (type === "pricing") {
    const plans = data?.plans || (Array.isArray(data) ? data : []);
    if (plans.length > 0) {
      return (
        <div className="space-y-1.5">
          {plans.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span style={{ color: "var(--text-primary)" }}>{p.name || p.tier || p.plan || `Plan ${i + 1}`}</span>
              <span className="font-bold" style={{ color: "#22c55e" }}>{p.price || p.cost || "N/A"}</span>
            </div>
          ))}
          {data?.model && <div className="text-[10px] px-2" style={{ color: "var(--text-muted)" }}>Model: {data.model}</div>}
        </div>
      );
    }
    // Fallback: show key-value pairs for pricing objects
    if (typeof data === "object" && data !== null) {
      const entries = Object.entries(data).filter(([k]) => !k.startsWith("_"));
      if (entries.length > 0) {
        return (
          <div className="space-y-1">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg"
                style={{ backgroundColor: "var(--bg-card)" }}>
                <span className="capitalize" style={{ color: "var(--text-primary)" }}>{k.replace(/_/g, " ")}</span>
                <span style={{ color: "#22c55e" }}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        );
      }
    }
  }

  if (type === "jobs") {
    const jobs = Array.isArray(data) ? data : data?.items || data?.positions || [];
    if (jobs.length > 0) {
      return (
        <div className="space-y-1">
          {jobs.slice(0, 8).map((j: any, i: number) => (
            <div key={i} className="text-xs px-2 py-1.5 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{j.title || j.role || j.position || JSON.stringify(j)}</span>
              {(j.location || j.loc) && <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{j.location || j.loc}</span>}
              {j.url && (
                <a href={j.url} target="_blank" rel="noopener noreferrer" className="shrink-0"
                  style={{ color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
          {jobs.length > 8 && (
            <div className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>+{jobs.length - 8} more</div>
          )}
        </div>
      );
    }
  }

  if (type === "reviews") {
    const reviews = data?.recentReviews || data?.reviews || (Array.isArray(data) ? data : []);
    return (
      <div className="space-y-1.5">
        {(data?.rating || data?.averageRating) && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold" style={{ color: "#f59e0b" }}>{data.rating || data.averageRating}/5</span>
            <span style={{ color: "var(--text-muted)" }}>({data.totalReviews || data.reviewCount || "?"} reviews)</span>
          </div>
        )}
        {reviews.slice(0, 4).map((r: any, i: number) => (
          <div key={i} className="text-[11px] px-2 py-1.5 rounded-lg"
            style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}>
            {r.summary || r.title || r.text || r.content || (typeof r === "string" ? r : JSON.stringify(r))}
          </div>
        ))}
        {reviews.length === 0 && typeof data === "object" && (
          <div className="space-y-1">
            {Object.entries(data).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
              <div key={k} className="text-[11px] px-2 py-1.5 rounded-lg flex justify-between"
                style={{ backgroundColor: "var(--bg-card)" }}>
                <span className="capitalize" style={{ color: "var(--text-muted)" }}>{k.replace(/_/g, " ")}</span>
                <span style={{ color: "var(--text-primary)" }}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === "blog") {
    const posts = Array.isArray(data) ? data : data?.posts || data?.articles || [];
    if (posts.length > 0) {
      return (
        <div className="space-y-1">
          {posts.slice(0, 6).map((p: any, i: number) => (
            <div key={i} className="text-xs px-2 py-1.5 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{p.title || p.headline || (typeof p === "string" ? p : JSON.stringify(p))}</span>
              {p.date && <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{p.date}</span>}
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0"
                  style={{ color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  if (type === "features") {
    const feats = Array.isArray(data) ? data : data?.items || [];
    if (feats.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {feats.map((f: any, i: number) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded-md"
              style={{ backgroundColor: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
              {typeof f === "string" ? f : f.name || f.title || JSON.stringify(f)}
            </span>
          ))}
        </div>
      );
    }
  }

  if (type === "social") {
    // Handle profiles array inside social data
    const profiles = data?.profiles || (Array.isArray(data) ? data : []);
    if (profiles.length > 0) {
      return (
        <div className="space-y-1">
          {profiles.map((s: any, i: number) => (
            <div key={i} className="text-xs px-2 py-1.5 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{s.platform || s.name || "Social"}</span>
              {s.handle && <span className="text-[10px] shrink-0" style={{ color: "#ec4899" }}>{s.handle}</span>}
              {s.followers && <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{s.followers}</span>}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="shrink-0"
                  style={{ color: "#ec4899" }} onClick={(e) => e.stopPropagation()}>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (typeof data === "object" && data !== null) {
      return (
        <div className="space-y-1">
          {Object.entries(data).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
            <div key={k} className="text-xs px-2 py-1.5 rounded-lg flex items-center justify-between"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span className="capitalize" style={{ color: "var(--text-primary)" }}>{k}</span>
              <span style={{ color: "#ec4899" }}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
            </div>
          ))}
        </div>
      );
    }
  }

  if (type === "forms") {
    const result = data?.result || data;
    const fields = result?.fieldsFilled || [];
    return (
      <div className="space-y-2">
        {/* Form info */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          {result?.formTitle && (
            <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
              {result.formTitle}
            </span>
          )}
          {data?.formType && (
            <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
              {data.formType}
            </span>
          )}
          {result?.success && (
            <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              Submitted
            </span>
          )}
          {data?.url && (
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-0.5 rounded-md"
              style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }} onClick={(e) => e.stopPropagation()}>
              {data.url.length > 40 ? data.url.substring(0, 40) + "..." : data.url} <ExternalLink size={8} />
            </a>
          )}
        </div>
        {/* Filled fields */}
        {fields.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fields Filled</div>
            {fields.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg"
                style={{ backgroundColor: "var(--bg-card)" }}>
                <span className="font-medium shrink-0 min-w-[100px]" style={{ color: "var(--accent)" }}>
                  {f.label || f.field || f.name}
                </span>
                <span className="break-all" style={{ color: "var(--text-primary)" }}>{f.value || "—"}</span>
              </div>
            ))}
          </div>
        )}
        {/* Confirmation */}
        {result?.confirmationMessage && (
          <div className="text-[11px] px-2 py-1.5 rounded-lg flex items-start gap-1.5"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#22c55e" }}>
            <span className="shrink-0 mt-0.5">✓</span>
            <span>{result.confirmationMessage}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === "leads") {
    const leads = Array.isArray(data) ? data : [];
    if (leads.length > 0) {
      return (
        <div className="space-y-1">
          {leads.slice(0, 10).map((l: any, i: number) => (
            <div key={i} className="text-xs px-2 py-1.5 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{l.name}</span>
              {l.company && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{l.company}</span>}
              {l.role && <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{l.role}</span>}
              {l.email && <span className="text-[10px] shrink-0" style={{ color: "#22c55e" }}>{l.email}</span>}
              {l.linkedinUrl && (
                <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" className="shrink-0"
                  style={{ color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
          {leads.length > 10 && <div className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>+{leads.length - 10} more</div>}
        </div>
      );
    }
  }

  // Fallback: pretty-print any data
  return (
    <pre className="text-[10px] overflow-auto max-h-32 p-2 rounded-lg"
      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const tabInfo = TABS.find((t) => t.id === tab);
  return (
    <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
        style={{ backgroundColor: `${tabInfo?.color || "#3b82f6"}10`, color: tabInfo?.color || "#3b82f6", opacity: 0.4 }}>
        {tabInfo?.icon || <Database size={18} />}
      </div>
      <p className="text-xs">No {tabInfo?.label?.toLowerCase() || tab} data yet</p>
      <p className="text-[10px] mt-1">Run a scan to collect intel</p>
    </div>
  );
}

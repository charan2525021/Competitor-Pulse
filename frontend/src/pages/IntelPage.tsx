import { useState } from "react";
import type { IntelRecord } from "../components/IntelDataPanel";
import { AIParticles } from "../components/FishAnimation";
import { ScrollReveal } from "../components/ScrollReveal";
import {
  DollarSign, Briefcase, Star, FileText, Cpu, Share2,
  Trash2, ExternalLink, ChevronDown, Database, Building2,
  MapPin, Calendar, Users, Mail,
} from "lucide-react";

interface IntelPageProps {
  records: IntelRecord[];
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

const TABS = [
  { id: "all" as const, label: "All", icon: <Database size={14} />, color: "#3b82f6" },
  { id: "pricing" as const, label: "Pricing", icon: <DollarSign size={14} />, color: "#22c55e" },
  { id: "jobs" as const, label: "Jobs", icon: <Briefcase size={14} />, color: "#3b82f6" },
  { id: "reviews" as const, label: "Reviews", icon: <Star size={14} />, color: "#f59e0b" },
  { id: "blog" as const, label: "Blog", icon: <FileText size={14} />, color: "#8b5cf6" },
  { id: "features" as const, label: "Features", icon: <Cpu size={14} />, color: "#06b6d4" },
  { id: "social" as const, label: "Social", icon: <Share2 size={14} />, color: "#ec4899" },
  { id: "leads" as const, label: "Leads", icon: <Users size={14} />, color: "#f59e0b" },
  { id: "forms" as const, label: "Forms", icon: <Mail size={14} />, color: "#6366f1" },
];

export function IntelPage({ records, onDelete, isAdmin }: IntelPageProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = records
    .filter((r) => activeTab === "all" || r.type === activeTab)
    .filter((r) => !search || r.company.toLowerCase().includes(search.toLowerCase()));

  // Group by company
  const grouped = new Map<string, IntelRecord[]>();
  for (const rec of filtered) {
    const list = grouped.get(rec.company) || [];
    list.push(rec);
    grouped.set(rec.company, list);
  }

  return (
    <div className="flex flex-col page-enter" style={{ height: "calc(100vh - 57px)", position: "relative" }}>
      <AIParticles count={6} />
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#fff" }}>
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Intel Database</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {records.length} records across {new Set(records.map((r) => r.company)).size} companies
            </p>
          </div>
          {/* Search */}
          <div className="ml-auto">
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm px-4 py-2 rounded-xl outline-none transition-all duration-200 w-64"
              style={{
                backgroundColor: "var(--bg-input)",
                border: "1.5px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const count = tab.id === "all" ? records.length : records.filter((r) => r.type === tab.id).length;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: active ? `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` : "var(--bg-input)",
                  color: active ? "#fff" : "var(--text-secondary)",
                  boxShadow: active ? `0 4px 12px ${tab.color}30` : "none",
                  border: `1.5px solid ${active ? "transparent" : "var(--border)"}`,
                }}
              >
                {tab.icon} {tab.label}
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: active ? "rgba(255,255,255,0.25)" : `${tab.color}15`,
                      color: active ? "#fff" : tab.color,
                    }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-muted)" }}>
            <Database size={48} style={{ opacity: 0.15 }} />
            <p className="text-sm font-medium">No intel data yet</p>
            <p className="text-xs">Run a competitive scan from the Agent tab to start collecting data</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([company, recs], i) => (
              <ScrollReveal key={company} animation="scroll-fade-up" delay={i * 80} threshold={0.08}>
                <CompanyGroup company={company} records={recs} onDelete={onDelete} isAdmin={isAdmin} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyGroup({ company, records, onDelete, isAdmin }: { company: string; records: IntelRecord[]; onDelete: (id: string) => void; isAdmin?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const latestDate = records.reduce((latest, r) => r.scanDate > latest ? r.scanDate : latest, records[0].scanDate);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
      {/* Company header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors duration-200"
        onClick={() => setCollapsed(!collapsed)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}>
          <Building2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{company}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Calendar size={10} style={{ color: "var(--text-muted)" }} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Last scan: {new Date(latestDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {records.map((r) => {
            const tab = TABS.find((t) => t.id === r.type);
            return tab ? (
              <span key={r.id} className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${tab.color}15`, color: tab.color }} title={tab.label}>
                {tab.icon}
              </span>
            ) : null;
          })}
        </div>
        <ChevronDown size={16} style={{
          color: "var(--text-muted)",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0)",
          transition: "transform 0.3s ease",
        }} />
      </div>

      {/* Records */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          {records.map((rec) => (
            <FullRecordCard key={rec.id} record={rec} onDelete={onDelete} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}

function FullRecordCard({ record, onDelete, isAdmin }: { record: IntelRecord; onDelete: (id: string) => void; isAdmin?: boolean }) {
  const tab = TABS.find((t) => t.id === record.type);
  const color = tab?.color || "#3b82f6";

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}>{tab?.icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{tab?.label}</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        {isAdmin && (
          <button onClick={() => onDelete(record.id)}
            className="w-6 h-6 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ color: "#ef4444" }} title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <FullRecordDetail record={record} />
    </div>
  );
}

function FullRecordDetail({ record }: { record: IntelRecord }) {
  const { type, data } = record;

  if (type === "pricing") {
    const plans = data?.plans || (Array.isArray(data) ? data : []);
    if (plans.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p: any, i: number) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>{p.name || p.tier || `Plan ${i + 1}`}</div>
              <div className="text-xl font-extrabold mb-1" style={{ color: "#22c55e" }}>{p.price || p.cost || "N/A"}</div>
              {p.period && <div className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>{p.period}</div>}
              {p.features?.map((f: string, j: number) => (
                <div key={j} className="text-xs mt-1 flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "#22c55e", marginTop: 2 }}>✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    if (typeof data === "object" && data !== null) {
      return <KeyValueGrid data={data} color="#22c55e" />;
    }
  }

  if (type === "jobs") {
    const jobs = Array.isArray(data) ? data : data?.items || data?.positions || [];
    return (
      <div className="space-y-2">
        {jobs.map((j: any, i: number) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <span className="flex-1 font-medium" style={{ color: "var(--text-primary)" }}>{j.title || j.role || j.position || JSON.stringify(j)}</span>
            {j.department && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg font-medium"
                style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{j.department}</span>
            )}
            {(j.location || j.loc) && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <MapPin size={10} /> {j.location || j.loc}
              </span>
            )}
            {j.url && (
              <a href={j.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
        {jobs.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No job data</p>}
      </div>
    );
  }

  if (type === "reviews") {
    const reviews = data?.recentReviews || data?.reviews || (Array.isArray(data) ? data : []);
    return (
      <div className="space-y-3">
        {(data?.rating || data?.averageRating) && (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <span className="text-3xl font-extrabold" style={{ color: "#f59e0b" }}>{data.rating || data.averageRating}</span>
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill={s <= Math.round(data.rating || data.averageRating) ? "#f59e0b" : "none"}
                    style={{ color: s <= Math.round(data.rating || data.averageRating) ? "#f59e0b" : "var(--text-muted)" }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {data.totalReviews || data.reviewCount || "?"} reviews · {data.platform || "G2"}
              </span>
            </div>
          </div>
        )}
        {reviews.map((r: any, i: number) => (
          <div key={i} className="px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              {r.rating && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>★ {r.rating}/5</span>
              )}
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{r.title || "Review"}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.summary || r.text || r.content}</p>
          </div>
        ))}
      </div>
    );
  }

  if (type === "blog") {
    const posts = Array.isArray(data) ? data : data?.posts || data?.articles || [];
    return (
      <div className="space-y-2">
        {posts.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#8b5cf6" }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title || p.headline || (typeof p === "string" ? p : JSON.stringify(p))}</div>
              {p.summary && <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{p.summary}</div>}
            </div>
            {p.date && <span className="text-[11px] px-2 py-0.5 rounded-md shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{p.date}</span>}
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (type === "features") {
    const feats = Array.isArray(data) ? data : data?.items || [];
    return (
      <div className="flex flex-wrap gap-2">
        {feats.map((f: any, i: number) => (
          <span key={i} className="text-xs px-3 py-1.5 rounded-xl font-medium"
            style={{ backgroundColor: "rgba(6,182,212,0.08)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
            {typeof f === "string" ? f : f.name || f.title || JSON.stringify(f)}
          </span>
        ))}
      </div>
    );
  }

  if (type === "social") {
    const profiles = data?.profiles || (Array.isArray(data) ? data : []);
    if (profiles.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {profiles.map((p: any, i: number) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl no-underline transition-all duration-200 hover:scale-[1.02]"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <Share2 size={14} style={{ color: "#ec4899" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.platform || "Social"}</div>
                {(p.handle || p.followers || p.subscribers) && (
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {p.handle}{p.handle && (p.followers || p.subscribers) ? " · " : ""}
                    {p.followers ? `${p.followers} followers` : ""}{p.subscribers ? `${p.subscribers} subs` : ""}
                  </div>
                )}
              </div>
              <ExternalLink size={12} style={{ color: "var(--accent)", opacity: 0.5 }} />
            </a>
          ))}
        </div>
      );
    }
    if (typeof data === "object" && data !== null) {
      return <KeyValueGrid data={data} color="#ec4899" />;
    }
  }

  if (type === "leads") {
    const leads = Array.isArray(data) ? data : data?.leads || [];
    return (
      <div className="space-y-2">
        {leads.map((l: any, i: number) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <Users size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: "var(--text-primary)" }}>{l.name || "Unknown"}</div>
              <div className="text-[11px] flex items-center gap-2 mt-0.5" style={{ color: "var(--text-muted)" }}>
                {l.role && <span>{l.role}</span>}
                {l.role && l.company && <span>·</span>}
                {l.company && <span>{l.company}</span>}
              </div>
            </div>
            {l.email && (
              <span className="text-[11px] px-2 py-0.5 rounded-md shrink-0"
                style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{l.email}</span>
            )}
            {l.linkedinUrl && (
              <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
        {leads.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No lead data</p>}
      </div>
    );
  }

  if (type === "forms") {
    const fills = Array.isArray(data) ? data : [data];
    return (
      <div className="space-y-2">
        {fills.map((f: any, i: number) => {
          const statusColor = f.status === "success" ? "#22c55e" : f.status === "failed" ? "#ef4444" : "#eab308";
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <Mail size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.url || "Unknown URL"}</div>
                <div className="text-[11px] flex items-center gap-2 mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {f.formType && <span className="capitalize">{f.formType.replace(/-/g, " ")}</span>}
                  {f.profileName && <><span>·</span><span>{f.profileName}</span></>}
                  {f.timestamp && <><span>·</span><span>{new Date(f.timestamp).toLocaleDateString()}</span></>}
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
                style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>{f.status || "unknown"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <pre className="text-xs overflow-auto max-h-48 p-3 rounded-xl"
      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function KeyValueGrid({ data, color }: { data: Record<string, any>; color: string }) {
  const entries = Object.entries(data).filter(([k]) => !k.startsWith("_"));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--bg-card)" }}>
          <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{k.replace(/_/g, " ")}</span>
          <span className="text-xs font-medium" style={{ color }}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}

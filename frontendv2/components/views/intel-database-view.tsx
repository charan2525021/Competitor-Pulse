"use client"

import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { loadCollection, saveCollection } from "@/lib/api"
import {
  Database,
  DollarSign,
  Briefcase,
  Star,
  FileText,
  Cpu,
  Share2,
  Users,
  Mail,
  Target,
  Building2,
  Calendar,
  ChevronDown,
  ExternalLink,
  MapPin,
  Trash2,
  Zap,
  Globe,
  ArrowRight,
  Crosshair,
} from "lucide-react"

/* ── Typed Intel Record ── */
interface IntelRecord {
  id: string
  company: string
  scanDate: string
  type: "pricing" | "jobs" | "reviews" | "blog" | "features" | "social" | "leads" | "forms" | "strategy"
  data: any
}

const TABS = [
  { id: "all" as const, label: "All", icon: Database, color: "#3b82f6" },
  { id: "pricing" as const, label: "Pricing", icon: DollarSign, color: "#22c55e" },
  { id: "jobs" as const, label: "Jobs", icon: Briefcase, color: "#3b82f6" },
  { id: "reviews" as const, label: "Reviews", icon: Star, color: "#f59e0b" },
  { id: "blog" as const, label: "Blog", icon: FileText, color: "#8b5cf6" },
  { id: "features" as const, label: "Features", icon: Cpu, color: "#06b6d4" },
  { id: "social" as const, label: "Social", icon: Share2, color: "#ec4899" },
  { id: "leads" as const, label: "Leads", icon: Users, color: "#f59e0b" },
  { id: "forms" as const, label: "Forms", icon: Mail, color: "#6366f1" },
  { id: "strategy" as const, label: "Strategy", icon: Target, color: "#ef4444" },
]

/* ── Helpers to build IntelRecords from history collections ── */
function buildRecordsFromAgentHistory(history: any[]): IntelRecord[] {
  const records: IntelRecord[] = []
  for (const entry of history) {
    const reports = entry.reports || entry.result?.reports || []
    const scanDate = entry.timestamp || entry.startedAt || new Date().toISOString()
    for (const r of reports) {
      const base = { company: r.company || "Unknown", scanDate }
      if (r.pricing && (r.pricing.plans?.length > 0 || Object.keys(r.pricing).length > 0))
        records.push({ ...base, id: crypto.randomUUID(), type: "pricing", data: r.pricing })
      const jobs = Array.isArray(r.jobs) ? r.jobs : r.jobs?.items || []
      if (jobs.length > 0)
        records.push({ ...base, id: crypto.randomUUID(), type: "jobs", data: jobs })
      if (r.reviews && Object.keys(r.reviews).length > 0)
        records.push({ ...base, id: crypto.randomUUID(), type: "reviews", data: r.reviews })
      const blog = Array.isArray(r.blog) ? r.blog : r.blog?.posts || []
      if (blog.length > 0)
        records.push({ ...base, id: crypto.randomUUID(), type: "blog", data: blog })
      const feat = Array.isArray(r.features) ? r.features : r.features?.items || []
      if (feat.length > 0)
        records.push({ ...base, id: crypto.randomUUID(), type: "features", data: feat })
      if (r.social && (Array.isArray(r.social) ? r.social.length > 0 : Object.keys(r.social).length > 0))
        records.push({ ...base, id: crypto.randomUUID(), type: "social", data: r.social })
      if (r.strategy && Object.keys(r.strategy).length > 0)
        records.push({ ...base, id: crypto.randomUUID(), type: "strategy", data: r.strategy })
    }
  }
  return records
}

function buildRecordsFromLeadHistory(history: any[]): IntelRecord[] {
  const records: IntelRecord[] = []
  for (const entry of history) {
    const leads = entry.leads || entry.result?.leads || []
    if (leads.length === 0) continue
    const query = entry.query || entry.prompt || "Lead Search"
    records.push({
      id: crypto.randomUUID(),
      company: query,
      scanDate: entry.timestamp || new Date().toISOString(),
      type: "leads",
      data: leads,
    })
  }
  return records
}

function buildRecordsFromFormHistory(history: any[]): IntelRecord[] {
  const records: IntelRecord[] = []
  for (const entry of history) {
    const result = entry.result || entry
    if (result.status === "running") continue
    let co = result.url || entry.url || "Unknown"
    try { if (co.startsWith("http")) co = new URL(co).hostname.replace("www.", "") } catch {}
    records.push({
      id: crypto.randomUUID(),
      company: co,
      scanDate: entry.timestamp || result.timestamp || new Date().toISOString(),
      type: "forms",
      data: result,
    })
  }
  return records
}

function buildRecordsFromStrategyHistory(history: any[]): IntelRecord[] {
  const records: IntelRecord[] = []
  for (const entry of history) {
    const result = entry.result || {}
    if (!result || Object.keys(result).length === 0) continue
    const tool = entry.tool || entry.type || "strategy"
    const toolLabel = tool === "market" ? "Market Breakdown" : tool === "distribution" ? "Distribution Plan" : tool === "weakness" ? "Competitor Weakness Map" : tool
    const input = entry.input || entry.prompt || entry.query || ""
    records.push({
      id: crypto.randomUUID(),
      company: `${toolLabel}: ${input}`.substring(0, 80),
      scanDate: entry.timestamp || new Date().toISOString(),
      type: "strategy",
      data: result,
    })
  }
  return records
}

/* ── Main View ── */
export function IntelDatabaseView() {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [records, setRecords] = useState<IntelRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set())

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [agentH, leadH, formH, stratH, intelDirect] = await Promise.all([
          loadCollection("agentHistory"),
          loadCollection("leadgenHistory"),
          loadCollection("formHistory"),
          loadCollection("strategyHistory"),
          loadCollection("intel"),
        ])
        // Intel collection records are authoritative; supplement with history-derived records
        const intelRecords: IntelRecord[] = (Array.isArray(intelDirect) ? intelDirect : [])
          .filter((r: any) => r.company && r.type)
          .map((r: any) => ({ id: r.id || crypto.randomUUID(), company: r.company, scanDate: r.scanDate || "", type: r.type, data: r.data }))
        const intelKeys = new Set(intelRecords.map((r) => `${r.company}::${r.type}::${r.scanDate}`))
        const historyRecords = [
          ...buildRecordsFromAgentHistory(agentH),
          ...buildRecordsFromLeadHistory(leadH),
          ...buildRecordsFromFormHistory(formH),
          ...buildRecordsFromStrategyHistory(stratH),
        ].filter((r) => !intelKeys.has(`${r.company}::${r.type}::${r.scanDate}`))
        setRecords([...intelRecords, ...historyRecords])
      } catch (e) {
        console.error("Failed to load intel data:", e)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() =>
    records
      .filter((r) => activeTab === "all" || r.type === activeTab)
      .filter((r) => !search || r.company.toLowerCase().includes(search.toLowerCase())),
    [records, activeTab, search]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, IntelRecord[]>()
    for (const rec of filtered) {
      const list = map.get(rec.company) || []
      list.push(rec)
      map.set(rec.company, list)
    }
    return map
  }, [filtered])

  const toggleCompany = (company: string) => {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(company)) next.delete(company)
      else next.add(company)
      return next
    })
  }

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] relative">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Intel Database</h1>
            <p className="text-xs text-muted-foreground">
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
              className="text-sm px-4 py-2 rounded-xl outline-none transition-all duration-200 w-64 bg-muted border border-border text-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const count = tab.id === "all" ? records.length : records.filter((r) => r.type === tab.id).length
            const active = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: active ? `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` : "var(--muted)",
                  color: active ? "#fff" : "var(--muted-foreground)",
                  boxShadow: active ? `0 4px 12px ${tab.color}30` : "none",
                  border: `1.5px solid ${active ? "transparent" : "var(--border)"}`,
                }}
              >
                <Icon size={14} /> {tab.label}
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
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading intel data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Database size={48} style={{ opacity: 0.15 }} />
            <p className="text-sm font-medium">No intel data yet</p>
            <p className="text-xs">Run a competitive scan from the Agent tab to start collecting data</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([company, recs]) => (
              <CompanyGroup
                key={company}
                company={company}
                records={recs}
                collapsed={collapsedCompanies.has(company)}
                onToggle={() => toggleCompany(company)}
                onDelete={deleteRecord}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Company Group Card ── */
function CompanyGroup({
  company, records, collapsed, onToggle, onDelete,
}: {
  company: string; records: IntelRecord[]; collapsed: boolean; onToggle: () => void; onDelete: (id: string) => void
}) {
  const latestDate = records.reduce((latest, r) => (r.scanDate > latest ? r.scanDate : latest), records[0].scanDate)

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-md">
      {/* Company header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors duration-200 hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
          <Building2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground">{company}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Calendar size={10} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              Last scan: {new Date(latestDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {records.map((r) => {
            const tab = TABS.find((t) => t.id === r.type)
            if (!tab) return null
            const Icon = tab.icon
            return (
              <span key={r.id} className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${tab.color}15`, color: tab.color }} title={tab.label}>
                <Icon size={14} />
              </span>
            )
          })}
        </div>
        <ChevronDown size={16} className="text-muted-foreground transition-transform duration-300"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }} />
      </div>

      {/* Records */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">
          {records.map((rec) => (
            <FullRecordCard key={rec.id} record={rec} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Record Card ── */
function FullRecordCard({ record, onDelete }: { record: IntelRecord; onDelete: (id: string) => void }) {
  const tab = TABS.find((t) => t.id === record.type)
  const color = tab?.color || "#3b82f6"
  const Icon = tab?.icon || Database

  return (
    <div className="rounded-xl p-4 bg-muted border border-border">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}>
          <Icon size={14} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{tab?.label}</span>
        <div className="flex-1 h-px bg-border" />
        <button onClick={() => onDelete(record.id)}
          className="w-6 h-6 rounded flex items-center justify-center transition-all duration-200 hover:scale-110 text-rose-500"
          title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
      <RecordDetail record={record} />
    </div>
  )
}

/* ── Record Detail Renderers ── */
function RecordDetail({ record }: { record: IntelRecord }) {
  const { type, data } = record

  if (type === "pricing") return <PricingDetail data={data} />
  if (type === "jobs") return <JobsDetail data={data} />
  if (type === "reviews") return <ReviewsDetail data={data} />
  if (type === "blog") return <BlogDetail data={data} />
  if (type === "features") return <FeaturesDetail data={data} />
  if (type === "social") return <SocialDetail data={data} />
  if (type === "leads") return <LeadsDetail data={data} />
  if (type === "forms") return <FormsDetail data={data} />
  if (type === "strategy") return <StrategyDetail data={data} />

  return (
    <pre className="text-xs overflow-auto max-h-48 p-3 rounded-xl bg-card text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function PricingDetail({ data }: { data: any }) {
  const plans = data?.plans || (Array.isArray(data) ? data : [])
  if (plans.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map((p: any, i: number) => (
          <div key={i} className="rounded-xl p-4 bg-card border border-border">
            <div className="text-sm font-bold mb-1 text-foreground">{p.name || p.tier || `Plan ${i + 1}`}</div>
            <div className="text-xl font-extrabold mb-1 text-emerald-500">{p.price || p.cost || "N/A"}</div>
            {p.period && <div className="text-[11px] mb-2 text-muted-foreground">{p.period}</div>}
            {p.features?.map((f: string, j: number) => (
              <div key={j} className="text-xs mt-1 flex items-start gap-1.5 text-muted-foreground">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }
  if (typeof data === "object" && data !== null) {
    return <KeyValueGrid data={data} color="#22c55e" />
  }
  return null
}

function JobsDetail({ data }: { data: any }) {
  const jobs = Array.isArray(data) ? data : data?.items || data?.positions || []
  return (
    <div className="space-y-2">
      {jobs.map((j: any, i: number) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-card border border-border">
          <span className="flex-1 font-medium text-foreground">{j.title || j.role || j.position || JSON.stringify(j)}</span>
          {j.department && (
            <span className="text-[11px] px-2 py-0.5 rounded-lg font-medium bg-blue-500/10 text-blue-500">{j.department}</span>
          )}
          {(j.location || j.loc) && (
            <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
              <MapPin size={10} /> {j.location || j.loc}
            </span>
          )}
          {j.url && (
            <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-primary">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ))}
      {jobs.length === 0 && <p className="text-xs text-muted-foreground">No job data</p>}
    </div>
  )
}

function ReviewsDetail({ data }: { data: any }) {
  const reviews = data?.recentReviews || data?.reviews || (Array.isArray(data) ? data : [])
  return (
    <div className="space-y-3">
      {(data?.rating || data?.averageRating) && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card">
          <span className="text-3xl font-extrabold text-amber-500">{data.rating || data.averageRating}</span>
          <div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16}
                  fill={s <= Math.round(data.rating || data.averageRating) ? "#f59e0b" : "none"}
                  className={s <= Math.round(data.rating || data.averageRating) ? "text-amber-500" : "text-muted-foreground"} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {data.totalReviews || data.reviewCount || "?"} reviews · {data.platform || "G2"}
            </span>
          </div>
        </div>
      )}
      {reviews.map((r: any, i: number) => (
        <div key={i} className="px-4 py-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            {r.rating && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500">★ {r.rating}/5</span>
            )}
            <span className="font-semibold text-sm text-foreground">{r.title || "Review"}</span>
          </div>
          <p className="text-xs text-muted-foreground">{r.summary || r.text || r.content}</p>
        </div>
      ))}
    </div>
  )
}

function BlogDetail({ data }: { data: any }) {
  const posts = Array.isArray(data) ? data : data?.posts || data?.articles || []
  return (
    <div className="space-y-2">
      {posts.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-violet-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">{p.title || p.headline || (typeof p === "string" ? p : JSON.stringify(p))}</div>
            {p.summary && <div className="text-xs mt-0.5 text-muted-foreground">{p.summary}</div>}
          </div>
          {p.date && <span className="text-[11px] px-2 py-0.5 rounded-md shrink-0 bg-violet-500/10 text-violet-500">{p.date}</span>}
          {p.url && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function FeaturesDetail({ data }: { data: any }) {
  const feats = Array.isArray(data) ? data : data?.items || []
  return (
    <div className="flex flex-wrap gap-2">
      {feats.map((f: any, i: number) => (
        <span key={i} className="text-xs px-3 py-1.5 rounded-xl font-medium border"
          style={{ backgroundColor: "rgba(6,182,212,0.08)", color: "#06b6d4", borderColor: "rgba(6,182,212,0.2)" }}>
          {typeof f === "string" ? f : f.name || f.title || JSON.stringify(f)}
        </span>
      ))}
    </div>
  )
}

function SocialDetail({ data }: { data: any }) {
  const profiles = data?.profiles || (Array.isArray(data) ? data : [])
  if (profiles.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {profiles.map((p: any, i: number) => (
          <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl no-underline transition-all duration-200 hover:scale-[1.02] bg-card border border-border">
            <Share2 size={14} className="text-pink-500" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{p.platform || "Social"}</div>
              {(p.handle || p.followers || p.subscribers) && (
                <div className="text-[11px] text-muted-foreground">
                  {p.handle}{p.handle && (p.followers || p.subscribers) ? " · " : ""}
                  {p.followers ? `${p.followers} followers` : ""}{p.subscribers ? `${p.subscribers} subs` : ""}
                </div>
              )}
            </div>
            <ExternalLink size={12} className="text-primary opacity-50" />
          </a>
        ))}
      </div>
    )
  }
  if (typeof data === "object" && data !== null) {
    return <KeyValueGrid data={data} color="#ec4899" />
  }
  return null
}

function LeadsDetail({ data }: { data: any }) {
  const leads = Array.isArray(data) ? data : data?.leads || []
  return (
    <div className="space-y-2">
      {leads.map((l: any, i: number) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-card border border-border">
          <Users size={14} className="text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{l.name || "Unknown"}</div>
            <div className="text-[11px] flex items-center gap-2 mt-0.5 text-muted-foreground">
              {l.role && <span>{l.role}</span>}
              {l.role && l.company && <span>·</span>}
              {l.company && <span>{l.company}</span>}
            </div>
          </div>
          {l.email && (
            <span className="text-[11px] px-2 py-0.5 rounded-md shrink-0 bg-blue-500/10 text-blue-500">{l.email}</span>
          )}
          {l.linkedinUrl && (
            <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ))}
      {leads.length === 0 && <p className="text-xs text-muted-foreground">No lead data</p>}
    </div>
  )
}

function FormsDetail({ data }: { data: any }) {
  const fills = Array.isArray(data) ? data : [data]
  return (
    <div className="space-y-2">
      {fills.map((f: any, i: number) => {
        const statusColor = f.status === "success" ? "#22c55e" : f.status === "failed" ? "#ef4444" : "#eab308"
        return (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-card border border-border">
            <Mail size={14} className="text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-foreground">{f.url || "Unknown URL"}</div>
              <div className="text-[11px] flex items-center gap-2 mt-0.5 text-muted-foreground">
                {f.formType && <span className="capitalize">{f.formType.replace(/-/g, " ")}</span>}
                {f.profileName && <><span>·</span><span>{f.profileName}</span></>}
                {f.timestamp && <><span>·</span><span>{new Date(f.timestamp).toLocaleDateString()}</span></>}
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
              style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>{f.status || "unknown"}</span>
          </div>
        )
      })}
    </div>
  )
}

function StrategyDetail({ data }: { data: any }) {
  // Agent-scraped strategy shape: tagline, valuePropositions, positioning, differentiators, partnerships, targetAudience
  const isAgentStrategy = data.tagline || data.positioning || data.valuePropositions || data.differentiators

  if (isAgentStrategy) {
    return (
      <div className="space-y-3">
        {data.tagline && (
          <div className="px-3 py-2.5 rounded-lg bg-card border border-border">
            <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Tagline</div>
            <div className="text-sm font-semibold text-foreground italic">&ldquo;{data.tagline}&rdquo;</div>
          </div>
        )}
        {data.positioning && (
          <div className="px-3 py-2.5 rounded-lg bg-card border border-border">
            <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Market Positioning</div>
            <div className="text-xs text-foreground">{data.positioning}</div>
          </div>
        )}
        {data.targetAudience && (
          <div className="px-3 py-2 rounded-lg bg-rose-500/[0.08] border border-rose-500/20">
            <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Target Audience</div>
            <div className="text-xs font-medium text-rose-500">{data.targetAudience}</div>
          </div>
        )}
        {data.valuePropositions?.length > 0 && (
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1.5">Value Propositions</div>
            <div className="space-y-1">
              {data.valuePropositions.map((vp: string, i: number) => (
                <div key={i} className="text-xs px-3 py-2 rounded-lg bg-emerald-500/[0.08] text-emerald-600 border border-emerald-500/20 font-medium">
                  {vp}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.differentiators?.length > 0 && (
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1.5">Differentiators</div>
            <div className="flex flex-wrap gap-1.5">
              {data.differentiators.map((d: string, i: number) => (
                <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/[0.08] text-blue-500 border border-blue-500/20 font-medium">{d}</span>
              ))}
            </div>
          </div>
        )}
        {data.partnerships?.length > 0 && (
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1.5">Partnerships & Integrations</div>
            <div className="flex flex-wrap gap-1.5">
              {data.partnerships.map((p: string, i: number) => (
                <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-violet-500/[0.08] text-violet-500 border border-violet-500/20 font-medium">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Strategy-tools shape: title, summary, tam/sam/som, trends, opportunities, moneyFlow, channels, competitors, etc.
  return (
    <div className="space-y-4">
      {data.title && <h3 className="text-sm font-bold text-foreground">{data.title}</h3>}
      {data.summary && <p className="text-xs text-muted-foreground">{data.summary}</p>}

      {/* TAM / SAM / SOM */}
      {data.tam && (
        <div className="grid grid-cols-3 gap-2">
          {[{ label: "TAM", ...(data.tam || {}) }, { label: "SAM", ...(data.sam || {}) }, { label: "SOM", ...(data.som || {}) }].filter((m) => m.value).map((m) => (
            <div key={m.label} className="rounded-xl p-3 bg-card border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
              <div className="text-lg font-bold mt-1 text-emerald-500">{m.value}</div>
              {m.description && <div className="text-[11px] mt-1 text-muted-foreground">{m.description}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Market Trends */}
      {data.trends?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market Trends</span>
          </div>
          <div className="space-y-1.5">
            {data.trends.map((t: any, i: number) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-xl bg-card">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                  style={{
                    backgroundColor: t.impact === "High" ? "rgba(239,68,68,0.1)" : t.impact === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.1)",
                    color: t.impact === "High" ? "#ef4444" : t.impact === "Medium" ? "#f59e0b" : "#3b82f6",
                  }}>
                  {t.impact}
                </span>
                <div>
                  <span className="text-sm font-medium">{t.trend}</span>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Underserved Opportunities */}
      {data.opportunities?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Underserved Opportunities</span>
          </div>
          <div className="space-y-1.5">
            {data.opportunities.map((o: any, i: number) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-card">
                <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium">{o.opportunity}</span>
                  {o.description && <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Where Money is Flowing */}
      {data.moneyFlow?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where Money is Flowing</span>
          </div>
          <div className="space-y-1.5">
            {data.moneyFlow.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-card">
                <div>
                  <span className="text-sm font-medium">{m.area}</span>
                  {m.evidence && <p className="text-xs text-muted-foreground">{m.evidence}</p>}
                </div>
                <span className="text-sm font-bold shrink-0 text-amber-500">{m.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acquisition Channels */}
      {data.channels?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acquisition Channels</span>
          </div>
          <div className="space-y-1.5">
            {data.channels.map((c: any, i: number) => (
              <div key={i} className="px-3 py-2 rounded-xl bg-card">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                  <span className="text-sm font-medium">{c.channel}</span>
                  {c.type && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: c.type === "paid" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: c.type === "paid" ? "#ef4444" : "#22c55e" }}>
                      {c.type}
                    </span>
                  )}
                  {c.reach && <span className="ml-auto text-xs text-muted-foreground">{c.reach}</span>}
                </div>
                {c.strategy && <p className="text-xs mt-1 text-muted-foreground">{c.strategy}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Viral Content Hooks */}
      {data.viralHooks?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-pink-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Viral Content Hooks</span>
          </div>
          <div className="space-y-1">
            {data.viralHooks.map((hook: string, i: number) => (
              <div key={i} className="text-sm px-3 py-2 rounded-xl flex items-start gap-2 bg-card">
                <span className="text-xs font-bold text-pink-500 shrink-0 mt-0.5">#{i + 1}</span>
                <span>{hook}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Execution Plan */}
      {data.dailyPlan?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">30-Day Execution Plan</span>
          </div>
          <div className="space-y-1.5">
            {data.dailyPlan.map((d: any, i: number) => (
              <div key={i} className="px-3 py-2 rounded-xl bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>{d.day}</span>
                  <span className="text-xs text-muted-foreground">{d.goal}</span>
                </div>
                {d.tasks?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {d.tasks.map((task: string, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">{task}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Analysis */}
      {data.competitors?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-rose-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competitor Analysis</span>
          </div>
          <div className="space-y-1.5">
            {data.competitors.map((c: any, ci: number) => (
              <div key={ci} className="rounded-xl bg-card border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Crosshair className="h-3 w-3 text-rose-500 shrink-0" />
                  <span className="text-sm font-medium flex-1">{c.name}</span>
                </div>
                <div className="px-3 pb-2 space-y-1.5">
                  {c.strengths?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold uppercase text-emerald-500 mb-1">Strengths</div>
                      <div className="flex flex-wrap gap-1">{c.strengths.map((s: string, si: number) => (
                        <span key={si} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">{s}</span>
                      ))}</div>
                    </div>
                  )}
                  {c.weaknesses?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold uppercase text-rose-500 mb-1">Weaknesses</div>
                      <div className="flex flex-wrap gap-1">{c.weaknesses.map((w: string, wi: number) => (
                        <span key={wi} className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500">{w}</span>
                      ))}</div>
                    </div>
                  )}
                  {c.ignoredAudience && <div className="text-xs text-muted-foreground">Ignored audience: {c.ignoredAudience}</div>}
                  {c.pricingGap && <div className="text-xs text-muted-foreground">Pricing gap: {c.pricingGap}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positioning Gaps */}
      {data.positioningGaps?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Positioning Gaps</span>
          </div>
          <div className="space-y-1.5">
            {data.positioningGaps.map((g: any, gi: number) => (
              <div key={gi} className="px-3 py-2 rounded-xl bg-card">
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium">{g.gap}</span>
                  {g.difficulty && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded ml-auto"
                      style={{ backgroundColor: g.difficulty === "Easy" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: g.difficulty === "Easy" ? "#22c55e" : "#f59e0b" }}>
                      {g.difficulty}
                    </span>
                  )}
                </div>
                {g.opportunity && <p className="text-xs mt-1 text-muted-foreground">{g.opportunity}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domination Strategy */}
      {data.dominationStrategy && (
        <div className="rounded-xl p-4"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(245,158,11,0.05))", border: "1.5px solid rgba(239,68,68,0.2)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-rose-500">Domination Strategy</div>
          {Object.entries(data.dominationStrategy).map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 mb-1.5">
              <ArrowRight className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                <span className="text-xs text-muted-foreground">{v as string}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fallback for unstructured result */}
      {typeof data === "string" && <p className="text-sm whitespace-pre-wrap">{data}</p>}
    </div>
  )
}

function KeyValueGrid({ data, color }: { data: Record<string, any>; color: string }) {
  const entries = Object.entries(data).filter(([k]) => !k.startsWith("_"))
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-card">
          <span className="text-xs capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
          <span className="text-xs font-medium" style={{ color }}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  )
}

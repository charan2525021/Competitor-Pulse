import { useState, useEffect } from "react";
import {
  LayoutDashboard, Radar, DollarSign, Briefcase, Star, FileText, Cpu,
  RefreshCw, TrendingUp, BarChart3, Activity,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { AIParticles } from "../components/FishAnimation";
import { fetchDashboardStats } from "../services/api";

interface DashboardStats {
  totalScans: number;
  totalCompetitors: number;
  totalPricingPages: number;
  totalJobs: number;
  totalReviews: number;
  totalBlogPosts: number;
  totalFeatures: number;
  competitorNames: string[];
  perScan: { scanIndex: number; competitors: number; pricing: number; jobs: number; reviews: number; blog: number; features: number }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboardStats();
      if (res.success) setStats(res);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const hasData = stats && stats.totalScans > 0;

  return (
    <div className="min-h-screen p-6 space-y-6 page-enter" style={{ maxWidth: 1400, margin: "0 auto", position: "relative" }}>
      <AIParticles count={8} />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #3b82f620, #8b5cf620)" }}>
          <LayoutDashboard size={20} style={{ color: "#3b82f6" }} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Intelligence Dashboard</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Overview of your competitive intelligence scans
          </p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          title="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-8"><span className="text-sm font-medium" style={{ color: "var(--accent)" }}>Fetching dashboard data...</span></div>}

      {/* Stat Cards */}
      {!loading && (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Scans" value={stats?.totalScans ?? 0} icon={<Radar size={20} />} color="blue" delay={0} />
        <StatCard label="Competitors" value={stats?.totalCompetitors ?? 0} icon={<TrendingUp size={20} />} color="purple" delay={1} />
        <StatCard label="Pricing Pages" value={stats?.totalPricingPages ?? 0} icon={<DollarSign size={20} />} color="green" delay={2} />
        <StatCard label="Job Postings" value={stats?.totalJobs ?? 0} icon={<Briefcase size={20} />} color="orange" delay={3} />
        <StatCard label="Reviews Found" value={stats?.totalReviews ?? 0} icon={<Star size={20} />} color="purple" delay={4} />
      </div>
      )}

      {!loading && hasData ? (
        <>
          {/* Per-Scan Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DataCard title="Scan History" icon={<BarChart3 size={16} />} color="#3b82f6">
              <div className="space-y-2">
                {stats.perScan.map((scan) => (
                  <div key={scan.scanIndex} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: "var(--bg-input)" }}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}>
                      #{scan.scanIndex}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {scan.competitors} competitor{scan.competitors !== 1 ? "s" : ""} analyzed
                      </div>
                      <div className="flex gap-3 mt-1">
                        {scan.pricing > 0 && <MiniStat icon={<DollarSign size={10} />} value={scan.pricing} color="#22c55e" />}
                        {scan.jobs > 0 && <MiniStat icon={<Briefcase size={10} />} value={scan.jobs} color="#3b82f6" />}
                        {scan.reviews > 0 && <MiniStat icon={<Star size={10} />} value={scan.reviews} color="#f59e0b" />}
                        {scan.blog > 0 && <MiniStat icon={<FileText size={10} />} value={scan.blog} color="#8b5cf6" />}
                        {scan.features > 0 && <MiniStat icon={<Cpu size={10} />} value={scan.features} color="#06b6d4" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>

            <DataCard title="Competitors Tracked" icon={<Radar size={16} />} color="#8b5cf6">
              <div className="flex flex-wrap gap-2">
                {stats.competitorNames.map((name) => (
                  <span key={name} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                    {name}
                  </span>
                ))}
              </div>
            </DataCard>

            <DataCard title="Intelligence Breakdown" icon={<Activity size={16} />} color="#06b6d4">
              <div className="space-y-3">
                <BarRow label="Pricing Pages" value={stats.totalPricingPages} max={stats.totalCompetitors} color="#22c55e" />
                <BarRow label="Job Postings" value={stats.totalJobs} max={Math.max(stats.totalJobs, 50)} color="#3b82f6" />
                <BarRow label="Reviews" value={stats.totalReviews} max={stats.totalCompetitors} color="#f59e0b" />
                <BarRow label="Blog Posts" value={stats.totalBlogPosts} max={Math.max(stats.totalBlogPosts, 20)} color="#8b5cf6" />
                <BarRow label="Features" value={stats.totalFeatures} max={Math.max(stats.totalFeatures, 30)} color="#06b6d4" />
              </div>
            </DataCard>

            <DataCard title="Data Coverage" icon={<TrendingUp size={16} />} color="#22c55e">
              <div className="grid grid-cols-2 gap-3">
                <CoverageCircle label="Pricing" found={stats.totalPricingPages} total={stats.totalCompetitors} color="#22c55e" />
                <CoverageCircle label="Reviews" found={stats.totalReviews} total={stats.totalCompetitors} color="#f59e0b" />
                <CoverageCircle label="Jobs" found={stats.perScan.filter((s) => s.jobs > 0).length} total={stats.totalScans} color="#3b82f6" />
                <CoverageCircle label="Blog" found={stats.perScan.filter((s) => s.blog > 0).length} total={stats.totalScans} color="#8b5cf6" />
              </div>
            </DataCard>
          </div>
        </>
      ) : !loading ? (
        <div className="rounded-2xl p-8 text-center animate-fade-in"
          style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          <div style={{ margin: "0 auto 16px", width: "fit-content" }}>
            <Radar size={48} style={{ color: "var(--accent)", opacity: 0.4 }} />
          </div>
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Run your first scan to populate the dashboard
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Go to the Agent tab and enter competitor names to start gathering intelligence.
            Reports will appear here after each scan completes.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DataCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 animate-scale-in"
      style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color }}>
      {icon} {value}
    </span>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-input)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CoverageCircle({ label, found, total, color }: { label: string; found: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{found}/{total}</span>
    </div>
  );
}

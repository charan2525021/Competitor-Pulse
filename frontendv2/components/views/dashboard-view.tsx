"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import {
  DollarSign,
  Users,
  Star,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  MessageSquare,
  Lightbulb,
  BarChart3,
  Newspaper,
  Zap,
  Share2,
  Globe,
  Loader2,
  Activity,
  Target,
  MapPin,
  ChevronDown,
  ArrowRight,
} from "lucide-react"
import { fetchDashboardStats, loadCollection } from "@/lib/api"

interface DashboardViewProps {
  analysisData?: any
  onRefresh?: () => void
  onExport?: () => void
}

export function DashboardView({ onRefresh, onExport }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [selectedCompetitor, setSelectedCompetitor] = useState<number>(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, history] = await Promise.all([
        fetchDashboardStats(),
        loadCollection("agentHistory"),
      ])
      if (statsRes.success) setStats(statsRes)
      const sorted = (history || [])
        .filter((h: any) => h.status === "complete" && h.reports?.length > 0)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      if (sorted.length > 0) {
        setReports(sorted[0].reports || [])
        setLastUpdated(sorted[0].timestamp ? new Date(sorted[0].timestamp).toLocaleString() : "Just now")
      }
    } catch (e) {
      console.error("Failed to load dashboard data:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (!stats || stats.totalScans === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <BarChart3 className="h-16 w-16 text-muted-foreground/30" />
        <div>
          <h2 className="text-xl font-semibold">No Analysis Data</h2>
          <p className="text-muted-foreground mt-1">Run a competitor analysis from the AI Agent page to see results here.</p>
        </div>
      </div>
    )
  }

  const report = reports[selectedCompetitor] || reports[0]
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <BarChart3 className="h-16 w-16 text-muted-foreground/30" />
        <div>
          <h2 className="text-xl font-semibold">No Report Data</h2>
          <p className="text-muted-foreground mt-1">Run a competitor analysis to see results here.</p>
        </div>
      </div>
    )
  }

  // Per-competitor data
  const plans = report.pricing?.plans || []
  const pricingModel = report.pricing?.model || ""
  const jobs = Array.isArray(report.jobs) ? report.jobs : []
  const reviews = report.reviews || {}
  const blog = Array.isArray(report.blog) ? report.blog : []
  const features = Array.isArray(report.features) ? report.features : []
  const social = report.social || {}
  const strategy = report.strategy || {}

  // Job department breakdown
  const deptMap: Record<string, number> = {}
  jobs.forEach((j: any) => {
    const dept = j.department || j.team || "Other"
    deptMap[dept] = (deptMap[dept] || 0) + 1
  })
  const departments = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))
  const maxDeptCount = departments.length > 0 ? departments[0].count : 1

  // Review sentiment (only from real scraped data)
  const sentiment = reviews.sentiment || {}
  const positive = sentiment.positive ?? 0
  const neutral = sentiment.neutral ?? 0
  const negative = sentiment.negative ?? 0
  const complaints = reviews.complaints || reviews.topComplaints || []

  // Review platforms
  const platforms = reviews.platforms || reviews.sources || []
  const hasPlatformBreakdown = platforms.length > 0

  // AI Insights from strategy + features
  const hasStrategy = strategy.tagline || strategy.positioning || strategy.valuePropositions?.length > 0 || strategy.differentiators?.length > 0

  // Build recommendations from strategy data
  const recommendations: { title: string; detail: string; priority: string }[] = []
  if (strategy.targetAudience) {
    recommendations.push({
      title: `Target ${strategy.targetAudience}`,
      detail: "Their audience targeting reveals a focus here — evaluate overlap with your GTM",
      priority: "high",
    })
  }
  if (strategy.differentiators?.length > 0) {
    recommendations.push({
      title: "Counter Key Differentiators",
      detail: `They differentiate on: ${strategy.differentiators.slice(0, 2).join(", ")}`,
      priority: "high",
    })
  }
  if (strategy.partnerships?.length > 0) {
    recommendations.push({
      title: "Build Key Integrations",
      detail: `They partner with: ${strategy.partnerships.slice(0, 3).join(", ")}`,
      priority: "medium",
    })
  }
  if (features.length > 0) {
    recommendations.push({
      title: "Feature Parity Check",
      detail: `They offer ${features.length} feature${features.length !== 1 ? "s" : ""} — review for competitive gaps`,
      priority: "medium",
    })
  }

  // Build opportunities/threats from data
  const opportunities: string[] = []
  const threats: string[] = []
  if (reviews.rating && reviews.rating < 4.5) opportunities.push("Customers seeking better experience")
  if (complaints.length > 0) opportunities.push(`Weak on: ${complaints.slice(0, 2).join(", ")}`)
  if (plans.length > 0) opportunities.push("Pricing differentiation potential")
  if (strategy.valuePropositions?.length > 0) threats.push("Strong value proposition messaging")
  if (reviews.rating && reviews.rating >= 4) threats.push(`High customer satisfaction (${reviews.rating}/5)`)
  if (strategy.partnerships?.length > 0) threats.push("Established partner ecosystem")
  if (jobs.length > 10) threats.push(`Aggressive hiring (${jobs.length} open roles)`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{report.company} Analysis</h1>
            {report.url && (
              <a href={report.url} target="_blank" rel="noopener noreferrer">
                <Badge variant="secondary" className="gap-1 text-xs cursor-pointer hover:bg-primary/10">
                  {(() => { try { return new URL(report.url).hostname.replace("www.", "") } catch { return report.url } })()}
                  <ExternalLink className="h-2.5 w-2.5" />
                </Badge>
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated || "Just now"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reports.length > 1 && (
            <div className="relative">
              <select
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(Number(e.target.value))}
                className="appearance-none bg-muted border rounded-lg px-3 py-1.5 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {reports.map((r: any, i: number) => (
                  <option key={i} value={i}>{r.company}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => { loadData(); onRefresh?.() }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScrollReveal delay={0}>
          <StatCard
            title="Open Positions"
            value={jobs.length}
            icon={Briefcase}
            iconColor="text-blue-500"
          />
        </ScrollReveal>
        <ScrollReveal delay={50}>
          <StatCard
            title="Review Rating"
            value={reviews.rating ? `${reviews.rating}/5` : "—"}
            subtitle={reviews.totalReviews ? `${reviews.totalReviews} reviews` : undefined}
            icon={Star}
            iconColor="text-amber-500"
          />
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <StatCard
            title="Pricing Tiers"
            value={plans.length || "—"}
            subtitle={pricingModel || undefined}
            icon={DollarSign}
            iconColor="text-emerald-500"
          />
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <StatCard
            title="Positive Sentiment"
            value={positive > 0 ? `${positive}%` : "—"}
            icon={MessageSquare}
            iconColor="text-cyan-500"
          />
        </ScrollReveal>
      </div>

      {/* Main 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pricing Analysis */}
        <ScrollReveal delay={200}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Pricing Analysis
                </CardTitle>
                {pricingModel && <Badge variant="outline">{pricingModel}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {plans.length > 0 ? (
                <div className="space-y-2">
                  {plans.map((tier: any, ti: number) => (
                    <div
                      key={ti}
                      className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{tier.name}</h4>
                        {tier.features?.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {tier.features.slice(0, 3).map((feature: string, fi: number) => (
                              <li key={fi} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{feature}</span>
                              </li>
                            ))}
                            {tier.features.length > 3 && (
                              <li className="text-[10px] text-muted-foreground pl-4">+{tier.features.length - 3} more</li>
                            )}
                          </ul>
                        )}
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-lg font-bold text-emerald-500">{tier.price}</p>
                        {tier.period && <p className="text-[10px] text-muted-foreground">{tier.period}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No pricing data found</p>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Job Trends */}
        <ScrollReveal delay={250}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Job Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length > 0 ? (
                <div className="space-y-4">
                  {departments.length > 0 && (
                    <div className="space-y-2.5">
                      {departments.map((dept) => {
                        const pct = Math.round((dept.count / jobs.length) * 100)
                        return (
                          <div key={dept.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <p className="font-medium text-sm w-28 truncate shrink-0">{dept.name}</p>
                              <div className="flex-1 bg-muted rounded-full h-2.5">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-teal-400 h-2.5 rounded-full transition-all"
                                  style={{ width: `${Math.max((dept.count / maxDeptCount) * 100, 8)}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-medium tabular-nums">{dept.count}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                <TrendingUp className="h-3 w-3 inline text-emerald-500 mr-0.5" />
                                {pct}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Recent Postings</h4>
                    <div className="space-y-1.5">
                      {jobs.slice(0, 4).map((job: any, ji: number) => (
                        <div key={ji} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="font-medium truncate">{job.title}</span>
                          {job.location && (
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">{job.location}</span>
                          )}
                        </div>
                      ))}
                      {jobs.length > 4 && (
                        <p className="text-xs text-center text-muted-foreground pt-1">+{jobs.length - 4} more positions</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No job data found</p>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Customer Reviews */}
        <ScrollReveal delay={300}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Customer Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.rating ? (
                <div className="space-y-4">
                  {/* Platform ratings */}
                  {hasPlatformBreakdown ? (
                    <div className="grid grid-cols-3 gap-3">
                      {platforms.slice(0, 3).map((p: any, pi: number) => (
                        <div key={pi} className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">{p.rating}</p>
                          <p className="text-xs font-medium text-muted-foreground">{p.name || p.platform}</p>
                          <p className="text-[10px] text-muted-foreground">{p.count || p.totalReviews || "—"} reviews</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{reviews.rating}</p>
                        <p className="text-xs font-medium text-muted-foreground">{reviews.platform || "G2"}</p>
                        <p className="text-[10px] text-muted-foreground">{reviews.totalReviews || "—"} reviews</p>
                      </div>
                    </div>
                  )}

                  {/* Sentiment bar */}
                  {(positive > 0 || neutral > 0 || negative > 0) && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Sentiment Analysis</h4>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        {positive > 0 && (
                          <div className="bg-emerald-500 transition-all" style={{ width: `${positive}%` }} />
                        )}
                        {neutral > 0 && (
                          <div className="bg-amber-400 transition-all" style={{ width: `${neutral}%` }} />
                        )}
                        {negative > 0 && (
                          <div className="bg-rose-500 transition-all" style={{ width: `${negative}%` }} />
                        )}
                      </div>
                      <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
                        <span>Positive {positive}%</span>
                        <span>Neutral {neutral}%</span>
                        <span>Negative {negative}%</span>
                      </div>
                    </div>
                  )}

                  {/* Top complaints */}
                  {complaints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Top Complaints</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {complaints.slice(0, 5).map((c: string, ci: number) => (
                          <span key={ci} className="text-[11px] px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent reviews */}
                  {reviews.recentReviews?.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Recent Feedback</h4>
                      <div className="space-y-1.5">
                        {reviews.recentReviews.slice(0, 3).map((rev: any, ri: number) => (
                          <div key={ri} className="p-2.5 rounded-lg bg-muted/50 border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">{rev.title || "Review"}</span>
                              {rev.rating && (
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={cn("h-2.5 w-2.5", s <= rev.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30")} />
                                  ))}
                                </div>
                              )}
                            </div>
                            {rev.summary && <p className="text-[11px] text-muted-foreground line-clamp-2">{rev.summary}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No review data found</p>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* AI Insights */}
        <ScrollReveal delay={350}>
          <Card className="h-full border-primary/20 bg-gradient-to-br from-background to-primary/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Insights
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">AI Powered</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary */}
                {(hasStrategy || reviews.rating) && (
                  <p className="text-sm text-muted-foreground">
                    {report.company} is {strategy.positioning
                      ? strategy.positioning.substring(0, 200)
                      : reviews.rating
                        ? `a competitor with a ${reviews.rating}/5 rating${reviews.totalReviews ? ` from ${reviews.totalReviews} reviews` : ""}, offering ${plans.length || "unknown"} pricing tier${plans.length !== 1 ? "s" : ""} and ${jobs.length} open position${jobs.length !== 1 ? "s" : ""}.`
                        : "being analyzed for competitive intelligence."
                    }
                  </p>
                )}

                {/* Strategic Recommendations */}
                {recommendations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">Strategic Recommendations</span>
                    </div>
                    <div className="space-y-2">
                      {recommendations.map((rec, ri) => (
                        <div key={ri} className="p-3 rounded-lg bg-muted/50 border">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="text-sm font-semibold">{rec.title}</h5>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]",
                                rec.priority === "high" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                                rec.priority === "medium" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                rec.priority === "low" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              )}
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunities & Threats */}
                {(opportunities.length > 0 || threats.length > 0) && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {opportunities.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-emerald-500 mb-2">Opportunities</h5>
                        <div className="space-y-1.5">
                          {opportunities.map((o, oi) => (
                            <div key={oi} className="flex items-start gap-1.5 text-xs">
                              <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {threats.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-rose-500 mb-2">Threats</h5>
                        <div className="space-y-1.5">
                          {threats.map((t, ti) => (
                            <div key={ti} className="flex items-start gap-1.5 text-xs">
                              <AlertCircle className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Strategy details */}
                {strategy.valuePropositions?.length > 0 && (
                  <div className="pt-2 border-t">
                    <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Value Propositions</h5>
                    <div className="space-y-1">
                      {strategy.valuePropositions.slice(0, 3).map((vp: string, vi: number) => (
                        <div key={vi} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.06] text-emerald-600 border border-emerald-500/10">
                          {vp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {strategy.differentiators?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Key Differentiators</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {strategy.differentiators.map((d: string, di: number) => (
                        <span key={di} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/[0.08] text-blue-500 border border-blue-500/15 font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {!hasStrategy && !reviews.rating && recommendations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Run a scan with strategy dimension to get AI insights</p>
                )}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* Additional sections: Blog, Features, Social in a row */}
      {(blog.length > 0 || features.length > 0 || (social.profiles?.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {blog.length > 0 && (
            <ScrollReveal delay={400}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Newspaper className="h-4 w-4 text-violet-500" />
                    Blog & News
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blog.slice(0, 5).map((post: any, bi: number) => (
                      <div key={bi} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium line-clamp-1">{post.title}</span>
                          {post.date && <span className="text-[10px] text-muted-foreground">{post.date}</span>}
                        </div>
                      </div>
                    ))}
                    {blog.length > 5 && <p className="text-[10px] text-center text-muted-foreground">+{blog.length - 5} more</p>}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {features.length > 0 && (
            <ScrollReveal delay={430}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4 text-cyan-500" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {features.slice(0, 12).map((f: any, fi: number) => (
                      <span key={fi} className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-medium">
                        {typeof f === "string" ? f : f.name || f.title || ""}
                      </span>
                    ))}
                    {features.length > 12 && (
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">+{features.length - 12}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {social.profiles?.length > 0 && (
            <ScrollReveal delay={460}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Share2 className="h-4 w-4 text-pink-500" />
                    Social Presence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {social.profiles.map((profile: any, si: number) => (
                      <a
                        key={si}
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border text-sm hover:border-pink-500/30 transition-colors no-underline"
                      >
                        <Share2 className="h-3 w-3 text-pink-500 shrink-0" />
                        <span className="font-medium truncate">{profile.platform}</span>
                        {(profile.followers || profile.handle) && (
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {profile.followers || profile.handle}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
        </div>
      )}

      {/* Scan History */}
      {stats.perScan?.length > 1 && (
        <ScrollReveal delay={500}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Scan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.perScan.map((scan: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{scan.scanIndex}</span>
                      </div>
                      <span className="font-medium text-sm">{scan.competitors} competitor{scan.competitors !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {scan.pricing > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><DollarSign className="h-2.5 w-2.5" />{scan.pricing}</Badge>}
                      {scan.jobs > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Briefcase className="h-2.5 w-2.5" />{scan.jobs}</Badge>}
                      {scan.reviews > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Star className="h-2.5 w-2.5" />{scan.reviews}</Badge>}
                      {scan.blog > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Newspaper className="h-2.5 w-2.5" />{scan.blog}</Badge>}
                      {scan.features > 0 && <Badge variant="secondary" className="text-[10px] gap-1"><Zap className="h-2.5 w-2.5" />{scan.features}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  )
}

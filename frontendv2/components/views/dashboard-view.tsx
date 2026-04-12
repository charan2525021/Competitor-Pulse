"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { ScrollReveal, StaggerReveal } from "@/components/scroll-reveal"
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
  Lightbulb
} from "lucide-react"

interface DashboardViewProps {
  analysisData?: {
    competitor?: {
      name: string
      domain: string
    }
    pricing?: {
      tiers: Array<{ name: string; price: string; features: string[] }>
      model: string
    }
    jobs?: {
      total: number
      departments: Array<{ name: string; count: number; trend: number }>
      recentPostings: Array<{ title: string; location: string; date: string }>
    }
    reviews?: {
      overallRating: number
      platforms: Array<{ name: string; rating: number; count: number }>
      sentiment: { positive: number; neutral: number; negative: number }
      topComplaints: string[]
    }
    insights?: {
      summary: string
      recommendations: Array<{ title: string; description: string; priority: string }>
      opportunities: string[]
      threats: string[]
    }
  }
  onRefresh?: () => void
  onExport?: () => void
}

// Mock data for demo
const mockData = {
  competitor: {
    name: "Acme Corp",
    domain: "acme.com"
  },
  pricing: {
    model: "Tiered SaaS",
    tiers: [
      { name: "Starter", price: "$29/mo", features: ["5 users", "Basic features", "Email support"] },
      { name: "Pro", price: "$79/mo", features: ["25 users", "Advanced features", "Priority support"] },
      { name: "Enterprise", price: "Custom", features: ["Unlimited users", "Custom features", "Dedicated support"] },
    ]
  },
  jobs: {
    total: 47,
    departments: [
      { name: "Engineering", count: 18, trend: 12 },
      { name: "Sales", count: 12, trend: -5 },
      { name: "Marketing", count: 8, trend: 25 },
      { name: "Product", count: 9, trend: 8 },
    ],
    recentPostings: [
      { title: "Senior Backend Engineer", location: "Remote", date: "2 days ago" },
      { title: "Product Manager", location: "San Francisco", date: "3 days ago" },
      { title: "Sales Development Rep", location: "New York", date: "5 days ago" },
    ]
  },
  reviews: {
    overallRating: 4.2,
    platforms: [
      { name: "G2", rating: 4.3, count: 284 },
      { name: "Capterra", rating: 4.1, count: 156 },
      { name: "TrustRadius", rating: 4.0, count: 89 },
    ],
    sentiment: { positive: 68, neutral: 22, negative: 10 },
    topComplaints: ["Slow customer support", "Steep learning curve", "Limited integrations", "Pricing concerns"]
  },
  insights: {
    summary: "Acme Corp is a well-established player with strong brand recognition but showing signs of stagnation in product innovation.",
    recommendations: [
      { title: "Target Enterprise Segment", description: "Their enterprise offering is weak, focus your GTM here", priority: "high" },
      { title: "Emphasize Support Quality", description: "Their main weakness is support - make it your strength", priority: "high" },
      { title: "Build Key Integrations", description: "They lack modern tool integrations (Notion, Linear, Slack)", priority: "medium" },
    ],
    opportunities: [
      "Growing demand for AI-powered features",
      "Enterprise customers seeking better support",
      "Integration marketplace opportunity"
    ],
    threats: [
      "Strong brand recognition",
      "Established customer base",
      "Recent funding announcement"
    ]
  }
}

export function DashboardView({ 
  analysisData = mockData,
  onRefresh,
  onExport 
}: DashboardViewProps) {
  const data = analysisData

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-rose-500/10 text-rose-500 border-rose-500/20"
      case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "low": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{data.competitor?.name || "Competitor"} Analysis</h1>
            <Badge variant="secondary">{data.competitor?.domain}</Badge>
          </div>
          <p className="text-muted-foreground">Last updated: Just now</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScrollReveal delay={0}>
          <StatCard
            title="Open Positions"
            value={data.jobs?.total || 0}
            trend={{ value: 15, label: "vs last month" }}
            icon={Briefcase}
            iconColor="text-blue-500"
          />
        </ScrollReveal>
        <ScrollReveal delay={50}>
          <StatCard
            title="Review Rating"
            value={`${data.reviews?.overallRating || 0}/5`}
            subtitle={`${data.reviews?.platforms.reduce((acc, p) => acc + p.count, 0) || 0} reviews`}
            icon={Star}
            iconColor="text-amber-500"
          />
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <StatCard
            title="Pricing Tiers"
            value={data.pricing?.tiers.length || 0}
            subtitle={data.pricing?.model}
            icon={DollarSign}
            iconColor="text-emerald-500"
          />
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <StatCard
            title="Positive Sentiment"
            value={`${data.reviews?.sentiment.positive || 0}%`}
            trend={{ value: 5, label: "improving" }}
            icon={MessageSquare}
            iconColor="text-primary"
          />
        </ScrollReveal>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Analysis */}
        <ScrollReveal delay={200}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Pricing Analysis
                </CardTitle>
                <Badge variant="outline">{data.pricing?.model}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.pricing?.tiers.map((tier, index) => (
                  <div 
                    key={tier.name}
                    className="flex items-start justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold">{tier.name}</h4>
                      <ul className="mt-2 space-y-1">
                        {tier.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{tier.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Job Trends */}
        <ScrollReveal delay={250}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Job Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.jobs?.departments.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <p className="font-medium">{dept.name}</p>
                      </div>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(dept.count / (data.jobs?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{dept.count}</span>
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        dept.trend > 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {dept.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(dept.trend)}%
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Recent Postings</h4>
                  {data.jobs?.recentPostings.slice(0, 3).map((job, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <span>{job.title}</span>
                      <span className="text-muted-foreground">{job.location}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Customer Reviews */}
        <ScrollReveal delay={300}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Customer Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Rating by Platform */}
                <div className="grid grid-cols-3 gap-3">
                  {data.reviews?.platforms.map((platform) => (
                    <div key={platform.name} className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{platform.rating}</p>
                      <p className="text-xs text-muted-foreground">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">{platform.count} reviews</p>
                    </div>
                  ))}
                </div>

                {/* Sentiment Bar */}
                <div>
                  <p className="text-sm font-medium mb-2">Sentiment Analysis</p>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500"
                      style={{ width: `${data.reviews?.sentiment.positive || 0}%` }}
                    />
                    <div 
                      className="bg-amber-500"
                      style={{ width: `${data.reviews?.sentiment.neutral || 0}%` }}
                    />
                    <div 
                      className="bg-rose-500"
                      style={{ width: `${data.reviews?.sentiment.negative || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Positive {data.reviews?.sentiment.positive}%</span>
                    <span>Neutral {data.reviews?.sentiment.neutral}%</span>
                    <span>Negative {data.reviews?.sentiment.negative}%</span>
                  </div>
                </div>

                {/* Top Complaints */}
                <div>
                  <p className="text-sm font-medium mb-2">Top Complaints</p>
                  <div className="flex flex-wrap gap-2">
                    {data.reviews?.topComplaints.map((complaint, i) => (
                      <Badge key={i} variant="outline" className="text-rose-500 border-rose-500/30">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {complaint}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* AI Insights */}
        <ScrollReveal delay={350}>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Insights
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  AI Powered
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{data.insights?.summary}</p>

                {/* Recommendations */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Strategic Recommendations
                  </p>
                  <div className="space-y-2">
                    {data.insights?.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg bg-background/50 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">{rec.title}</h4>
                          <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opportunities & Threats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-emerald-500">Opportunities</p>
                    <ul className="space-y-1">
                      {data.insights?.opportunities.map((opp, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2 text-rose-500">Threats</p>
                    <ul className="space-y-1">
                      {data.insights?.threats.map((threat, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 text-rose-500 mt-0.5 flex-shrink-0" />
                          {threat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  )
}

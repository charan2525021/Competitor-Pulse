"use client"

import { cn } from "@/lib/utils"
import { 
  Globe, 
  Target, 
  AlertTriangle, 
  Rocket, 
  Lightbulb,
  TrendingUp,
  Users,
  Building2,
  ChevronRight,
  Sparkles
} from "lucide-react"

interface StrategyCardProps {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  featured?: boolean
  className?: string
}

function StrategyCard({ title, icon: Icon, children, featured = false, className }: StrategyCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        featured 
          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20" 
          : "bg-card border-border hover:border-muted-foreground/20",
        className
      )}
    >
      <div className={cn(
        "flex items-center gap-3 p-5 border-b",
        featured ? "border-primary/20" : "border-border/50"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          featured ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            featured ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1">
          <h3 className={cn(
            "font-semibold text-base",
            featured ? "text-primary" : "text-card-foreground"
          )}>
            {title}
          </h3>
          {featured && (
            <p className="text-xs text-primary/70 mt-0.5">Powered by AI analysis</p>
          )}
        </div>
        {featured && (
          <span className="px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Strategic
          </span>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

interface MarketMetricProps {
  label: string
  value: string
  description: string
  icon: React.ElementType
}

function MarketMetric({ label, value, description, icon: Icon }: MarketMetricProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-xl font-semibold text-foreground mb-1">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface WeaknessItemProps {
  title: string
  severity: "high" | "medium" | "low"
  description: string
}

function WeaknessItem({ title, severity, description }: WeaknessItemProps) {
  const severityColors = {
    high: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  }

  const severityBg = {
    high: "border-rose-500/20",
    medium: "border-amber-500/20",
    low: "border-emerald-500/20",
  }

  return (
    <div className={cn("p-4 rounded-lg border bg-muted/30", severityBg[severity])}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-foreground text-sm">{title}</h4>
        <span className={cn(
          "px-2 py-0.5 text-xs font-medium rounded-full border",
          severityColors[severity]
        )}>
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

interface StrategyItemProps {
  title: string
  description: string
  impact: string
}

function StrategyItem({ title, description, impact }: StrategyItemProps) {
  return (
    <div className="group p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5 group-hover:bg-primary/20 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{description}</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            {impact}
          </span>
        </div>
      </div>
    </div>
  )
}

interface RecommendationProps {
  priority: number
  title: string
  description: string
  timeframe: string
  effort: "Low" | "Medium" | "High"
}

function Recommendation({ priority, title, description, timeframe, effort }: RecommendationProps) {
  const effortColors = {
    Low: "text-emerald-400",
    Medium: "text-amber-400",
    High: "text-rose-400",
  }

  return (
    <div className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-primary/10 hover:border-primary/30 transition-all">
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{priority}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Timeline: <span className="text-foreground font-medium">{timeframe}</span>
          </span>
          <span className="text-muted-foreground">
            Effort: <span className={cn("font-medium", effortColors[effort])}>{effort}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export function StrategyEngine() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Strategy Engine Active
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Strategic Analysis</h2>
        <p className="text-muted-foreground mt-1">AI-powered competitive intelligence and go-to-market recommendations</p>
      </div>

      {/* Strategy Recommendations - Featured Section */}
      <StrategyCard title="Strategy Recommendations" icon={Lightbulb} featured>
        <div className="space-y-4">
          <Recommendation
            priority={1}
            title="Launch Premium Support Tier"
            description="Competitor weakness in customer support creates an opportunity. Introduce 24/7 dedicated support for enterprise customers to capture dissatisfied users migrating from competitors."
            timeframe="4-6 weeks"
            effort="Medium"
          />
          <Recommendation
            priority={2}
            title="Aggressive Pricing for Mid-Market"
            description="Position 10% below competitor on mid-tier plans while emphasizing superior onboarding experience. Target companies with 50-200 employees actively evaluating alternatives."
            timeframe="2 weeks"
            effort="Low"
          />
          <Recommendation
            priority={3}
            title="EMEA Market Expansion"
            description="Competitor is focusing on EMEA expansion. Preemptively establish partnerships with key European integrators and localize product for German and French markets."
            timeframe="3-4 months"
            effort="High"
          />
        </div>
      </StrategyCard>

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Market Breakdown */}
        <StrategyCard title="Market Breakdown" icon={Globe}>
          <div className="space-y-3">
            <MarketMetric
              icon={Globe}
              label="TAM"
              value="$24.5B"
              description="Total Addressable Market - Global AI analytics software market by 2027"
            />
            <MarketMetric
              icon={Building2}
              label="SAM"
              value="$8.2B"
              description="Serviceable Addressable Market - Enterprise & mid-market segments in NA/EU"
            />
            <MarketMetric
              icon={Users}
              label="SOM"
              value="$340M"
              description="Serviceable Obtainable Market - Realistic capture within 3 years"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Market growing at 23.4% CAGR. Competitor holds estimated 12% of SAM.
            </p>
          </div>
        </StrategyCard>

        {/* Competitor Weakness Map */}
        <StrategyCard title="Competitor Weakness Map" icon={AlertTriangle}>
          <div className="space-y-3">
            <WeaknessItem
              title="Customer Support Response Time"
              severity="high"
              description="Average response time of 48+ hours. 34% of negative reviews cite slow support as primary issue."
            />
            <WeaknessItem
              title="Mobile Experience"
              severity="high"
              description="Mobile app rated 2.8/5 stars. Users report frequent crashes and missing features."
            />
            <WeaknessItem
              title="Enterprise Integrations"
              severity="medium"
              description="Limited native integrations with Salesforce, SAP. Requires custom middleware for enterprise deployments."
            />
            <WeaknessItem
              title="Onboarding Complexity"
              severity="medium"
              description="Average time-to-value is 3 weeks. Self-service adoption rate is only 23%."
            />
          </div>
        </StrategyCard>
      </div>

      {/* Go-To-Market Strategy - Full Width */}
      <StrategyCard title="Go-To-Market Strategy" icon={Rocket}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StrategyItem
            title="Product-Led Growth Focus"
            description="Implement freemium tier with usage-based upgrade triggers. Target individual users within target accounts."
            impact="40% lower CAC"
          />
          <StrategyItem
            title="Partner Channel Development"
            description="Establish reseller partnerships with top 5 consulting firms. White-label solution for system integrators."
            impact="3x enterprise pipeline"
          />
          <StrategyItem
            title="Content Authority Play"
            description="Launch industry benchmark report and competitive analysis tools. Capture high-intent search traffic."
            impact="2x organic leads"
          />
          <StrategyItem
            title="Strategic Account Targeting"
            description="Focus on competitor's largest accounts showing churn signals. Deploy dedicated success teams."
            impact="$2M ARR opportunity"
          />
        </div>
        <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Strategy confidence: <span className="text-foreground font-medium">87%</span> based on 1,247 data points
          </p>
          <span className="text-xs text-primary flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Last updated 2 hours ago
          </span>
        </div>
      </StrategyCard>
    </div>
  )
}

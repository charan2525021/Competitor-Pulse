"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Globe,
  Calendar,
  Users,
  DollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface CompetitorData {
  id: string
  name: string
  domain: string
  logo?: string
  description?: string
  industry?: string
  employeeCount?: string
  founded?: string
  pricing?: {
    model: string
    startingPrice?: string
  }
  metrics?: {
    marketShare?: number
    growthRate?: number
    sentiment?: number
  }
  tags?: string[]
  lastUpdated?: Date
}

interface CompetitorCardProps {
  competitor: CompetitorData
  className?: string
  variant?: "default" | "compact" | "detailed"
  onAnalyze?: (id: string) => void
  onView?: (id: string) => void
}

export function CompetitorCard({
  competitor,
  className,
  variant = "default",
  onAnalyze,
  onView,
}: CompetitorCardProps) {
  const getTrendIcon = (value?: number) => {
    if (value === undefined) return null
    if (value > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />
    if (value < 0) return <TrendingDown className="h-4 w-4 text-rose-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getSentimentColor = (sentiment?: number) => {
    if (sentiment === undefined) return "text-muted-foreground"
    if (sentiment >= 70) return "text-emerald-500"
    if (sentiment >= 40) return "text-amber-500"
    return "text-rose-500"
  }

  if (variant === "compact") {
    return (
      <Card className={cn("transition-all hover:shadow-md hover:border-primary/30", className)}>
        <CardContent className="flex items-center gap-4 p-4">
          {/* Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {competitor.logo ? (
              <img src={competitor.logo} alt={competitor.name} className="h-6 w-6 object-contain" />
            ) : (
              <Globe className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{competitor.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{competitor.domain}</p>
          </div>

          {/* Metrics */}
          {competitor.metrics?.growthRate !== undefined && (
            <div className="flex items-center gap-1">
              {getTrendIcon(competitor.metrics.growthRate)}
              <span className="text-sm font-medium">
                {Math.abs(competitor.metrics.growthRate)}%
              </span>
            </div>
          )}

          {/* Action */}
          <Button variant="ghost" size="sm" onClick={() => onView?.(competitor.id)}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "group transition-all duration-300 hover:shadow-lg hover:border-primary/30",
      "bg-card/50 backdrop-blur-sm",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/50 ring-1 ring-border">
              {competitor.logo ? (
                <img src={competitor.logo} alt={competitor.name} className="h-7 w-7 object-contain" />
              ) : (
                <Globe className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{competitor.name}</CardTitle>
              <a 
                href={`https://${competitor.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {competitor.domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Industry Badge */}
          {competitor.industry && (
            <Badge variant="secondary" className="text-xs">
              {competitor.industry}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {competitor.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {competitor.description}
          </p>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {competitor.employeeCount && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{competitor.employeeCount} employees</span>
            </div>
          )}
          {competitor.founded && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Founded {competitor.founded}</span>
            </div>
          )}
          {competitor.pricing?.startingPrice && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>From {competitor.pricing.startingPrice}</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        {competitor.metrics && (
          <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-3">
            {competitor.metrics.marketShare !== undefined && (
              <div className="flex-1 text-center">
                <p className="text-lg font-semibold">{competitor.metrics.marketShare}%</p>
                <p className="text-xs text-muted-foreground">Market Share</p>
              </div>
            )}
            {competitor.metrics.growthRate !== undefined && (
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(competitor.metrics.growthRate)}
                  <p className="text-lg font-semibold">{Math.abs(competitor.metrics.growthRate)}%</p>
                </div>
                <p className="text-xs text-muted-foreground">Growth Rate</p>
              </div>
            )}
            {competitor.metrics.sentiment !== undefined && (
              <div className="flex-1 text-center">
                <p className={cn("text-lg font-semibold", getSentimentColor(competitor.metrics.sentiment))}>
                  {competitor.metrics.sentiment}%
                </p>
                <p className="text-xs text-muted-foreground">Sentiment</p>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {competitor.tags && competitor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {competitor.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {competitor.tags.length > 4 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{competitor.tags.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => onAnalyze?.(competitor.id)}
          >
            Run Analysis
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView?.(competitor.id)}
          >
            View Details
          </Button>
        </div>

        {/* Last Updated */}
        {competitor.lastUpdated && (
          <p className="text-xs text-muted-foreground text-center">
            Last updated {competitor.lastUpdated.toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

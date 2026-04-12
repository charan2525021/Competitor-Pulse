"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label?: string
  }
  icon?: LucideIcon
  iconColor?: string
  className?: string
  variant?: "default" | "highlighted" | "minimal"
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = "text-primary",
  className,
  variant = "default",
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />
    if (trend.value < 0) return <TrendingDown className="h-4 w-4 text-rose-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTrendColor = () => {
    if (!trend) return ""
    if (trend.value > 0) return "text-emerald-500"
    if (trend.value < 0) return "text-rose-500"
    return "text-muted-foreground"
  }

  if (variant === "minimal") {
    return (
      <div className={cn("space-y-1", className)}>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={cn("text-sm font-medium", getTrendColor())}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md",
      variant === "highlighted" && "border-primary/30 bg-primary/5",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              variant === "highlighted" ? "bg-primary/10" : "bg-muted"
            )}>
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
          )}
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-2">
            {getTrendIcon()}
            <span className={cn("text-sm font-medium", getTrendColor())}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
            {trend.label && (
              <span className="text-sm text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

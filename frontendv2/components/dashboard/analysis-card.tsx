import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface AnalysisCardProps {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  highlighted?: boolean
  className?: string
}

export function AnalysisCard({ 
  title, 
  icon: Icon, 
  children, 
  highlighted = false,
  className 
}: AnalysisCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-all",
        highlighted 
          ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5" 
          : "bg-card border-border hover:border-muted-foreground/20",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          highlighted ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            highlighted ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        <h3 className={cn(
          "font-semibold",
          highlighted ? "text-primary" : "text-card-foreground"
        )}>
          {title}
        </h3>
        {highlighted && (
          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
            AI Powered
          </span>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

interface DataPointProps {
  label: string
  value: string
  trend?: "up" | "down" | "neutral"
}

export function DataPoint({ label, value, trend }: DataPointProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "text-sm font-medium",
        trend === "up" && "text-emerald-400",
        trend === "down" && "text-rose-400",
        trend === "neutral" && "text-foreground",
        !trend && "text-foreground"
      )}>
        {value}
      </span>
    </div>
  )
}

interface BulletListProps {
  items: string[]
  variant?: "default" | "highlight"
}

export function BulletList({ items, variant = "default" }: BulletListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <span className={cn(
            "mt-2 w-1.5 h-1.5 rounded-full shrink-0",
            variant === "highlight" ? "bg-primary" : "bg-muted-foreground"
          )} />
          <span className={cn(
            variant === "highlight" ? "text-foreground" : "text-muted-foreground"
          )}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

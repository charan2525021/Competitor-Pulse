"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import {
  Search,
  Filter,
  Download,
  Database,
  Globe,
  Calendar,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  DollarSign,
  Briefcase,
  Star,
  Lightbulb
} from "lucide-react"
import type { IntelRecord } from "@/lib/types"

// Mock intel data
const mockIntel: IntelRecord[] = [
  {
    id: "1",
    type: "pricing",
    source: "stripe.com",
    title: "Stripe Pricing Structure",
    summary: "2.9% + $0.30 per transaction, volume discounts available",
    data: { model: "Transaction-based", tiers: 3 },
    tags: ["payments", "saas", "enterprise"],
    collectedAt: new Date(Date.now() - 86400000),
    confidence: 95,
  },
  {
    id: "2",
    type: "jobs",
    source: "notion.so",
    title: "Notion Hiring Trends",
    summary: "47 open positions, 60% engineering roles, expanding in APAC",
    data: { total: 47, engineering: 28, growth: 15 },
    tags: ["hiring", "expansion", "engineering"],
    collectedAt: new Date(Date.now() - 172800000),
    confidence: 88,
  },
  {
    id: "3",
    type: "reviews",
    source: "linear.app",
    title: "Linear Customer Sentiment",
    summary: "4.8/5 average, praised for speed, some request more integrations",
    data: { rating: 4.8, positive: 92, reviews: 234 },
    tags: ["customer-feedback", "positive", "integrations"],
    collectedAt: new Date(Date.now() - 259200000),
    confidence: 92,
  },
  {
    id: "4",
    type: "strategy",
    source: "figma.com",
    title: "Figma Market Position",
    summary: "Dominant in design tools, facing competition from Canva enterprise",
    data: { marketShare: 35, competitors: 5 },
    tags: ["market-analysis", "competition", "design"],
    collectedAt: new Date(Date.now() - 345600000),
    confidence: 78,
  },
  {
    id: "5",
    type: "pricing",
    source: "slack.com",
    title: "Slack Enterprise Pricing",
    summary: "$15/user/month Pro, Enterprise Grid custom pricing",
    data: { proPrice: 15, hasEnterprise: true },
    tags: ["communication", "enterprise", "per-seat"],
    collectedAt: new Date(Date.now() - 432000000),
    confidence: 96,
  },
]

const typeConfig = {
  pricing: { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  jobs: { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
  reviews: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
  strategy: { icon: Lightbulb, color: "text-purple-500", bg: "bg-purple-500/10" },
}

export function IntelDatabaseView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [intel, setIntel] = useState<IntelRecord[]>(mockIntel)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Fetch intel records from API
  useEffect(() => {
    const fetchIntel = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/store?collection=intel")
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          // Transform API data to IntelRecord format
          const records = data.data.map((item: { 
            id: string
            type: string
            source: string
            title: string
            summary?: string
            data?: Record<string, unknown>
            tags?: string[]
            collected_at?: string
            confidence?: number
          }) => ({
            id: item.id,
            type: item.type,
            source: item.source,
            title: item.title,
            summary: item.summary || "",
            data: item.data || {},
            tags: item.tags || [],
            collectedAt: new Date(item.collected_at || Date.now()),
            confidence: item.confidence || 80,
          }))
          setIntel([...records, ...mockIntel])
        }
      } catch (error) {
        console.error("Failed to fetch intel:", error)
      }
      setIsLoading(false)
    }
    fetchIntel()
  }, [])

  const filteredIntel = intel.filter(record => {
    const matchesSearch = !searchQuery || 
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.summary.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || record.type === selectedType
    return matchesSearch && matchesType
  })

  const types = ["pricing", "jobs", "reviews", "strategy"]

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRecords(newSelected)
  }

  const deleteSelected = () => {
    setIntel(intel.filter(r => !selectedRecords.has(r.id)))
    setSelectedRecords(new Set())
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-emerald-500"
    if (confidence >= 75) return "text-amber-500"
    return "text-rose-500"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Database</h1>
          <p className="text-muted-foreground">Browse all collected competitor intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Database className="mr-1 h-3 w-3" />
            {intel.length} records
          </Badge>
          {selectedRecords.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedRecords.size})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <ScrollReveal delay={100}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search intelligence records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {types.map((type) => {
                  const config = typeConfig[type as keyof typeof typeConfig]
                  const Icon = config.icon
                  return (
                    <Button
                      key={type}
                      variant={selectedType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(selectedType === type ? null : type)}
                      className="capitalize"
                    >
                      <Icon className="mr-1 h-4 w-4" />
                      {type}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Records List */}
      <ScrollReveal delay={200}>
        <div className="space-y-3">
          {filteredIntel.map((record, index) => {
            const config = typeConfig[record.type as keyof typeof typeConfig]
            const Icon = config.icon
            const isExpanded = expandedId === record.id
            const isSelected = selectedRecords.has(record.id)

            return (
              <Card 
                key={record.id}
                className={cn(
                  "transition-all duration-200",
                  isSelected && "border-primary/50 bg-primary/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(record.id)}
                      className={cn(
                        "mt-1 flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      )}
                    >
                      {isSelected && <span className="text-xs">✓</span>}
                    </button>

                    {/* Type Icon */}
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{record.title}</h3>
                        <Badge variant="outline" className="capitalize text-xs">
                          {record.type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{record.summary}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {record.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {record.collectedAt.toLocaleDateString()}
                        </span>
                        <span className={cn("font-medium", getConfidenceColor(record.confidence))}>
                          {record.confidence}% confidence
                        </span>
                      </div>

                      {/* Tags */}
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {record.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="mr-1 h-2 w-2" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Expanded Data */}
                      {isExpanded && record.data && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(record.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleExpand(record.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredIntel.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">No Records Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollReveal>
    </div>
  )
}

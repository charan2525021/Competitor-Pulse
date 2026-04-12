"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Database, 
  Search, 
  DollarSign,
  Briefcase,
  Star,
  Newspaper,
  MessageSquare,
  Filter,
  RefreshCw
} from "lucide-react"
import type { IntelRecord } from "@/lib/types"

export function IntelView() {
  const [records, setRecords] = React.useState<IntelRecord[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchIntel = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "all") params.set("type", typeFilter)
      if (searchQuery) params.set("search", searchQuery)
      
      const response = await fetch(`/api/intel?${params}`)
      const data = await response.json()
      setRecords(data.records || [])
    } catch (error) {
      console.error("Failed to fetch intel:", error)
    } finally {
      setIsLoading(false)
    }
  }, [typeFilter, searchQuery])

  React.useEffect(() => {
    fetchIntel()
  }, [fetchIntel])

  const getTypeIcon = (type: IntelRecord["type"]) => {
    switch (type) {
      case "pricing":
        return <DollarSign className="h-4 w-4" />
      case "job":
        return <Briefcase className="h-4 w-4" />
      case "review":
        return <Star className="h-4 w-4" />
      case "news":
        return <Newspaper className="h-4 w-4" />
      case "social":
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeBadgeStyle = (type: IntelRecord["type"]) => {
    switch (type) {
      case "pricing":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "job":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "review":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "news":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "social":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHrs < 1) return "Just now"
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Intel Database</h1>
          <p className="text-sm text-muted-foreground">
            All collected competitive intelligence in one place
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Database className="h-3.5 w-3.5" />
          {records.length} Records
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search intel records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="job">Jobs</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchIntel}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`gap-1 ${getTypeBadgeStyle(record.type)}`}>
                        {getTypeIcon(record.type)}
                        {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                      </Badge>
                      <span className="font-medium">{record.company}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(record.collectedAt)}
                      </span>
                    </div>
                    <h3 className="font-medium">{record.title}</h3>
                    <p className="text-sm text-muted-foreground">{record.content}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">Source: {record.source}</span>
                      <div className="flex gap-1">
                        {record.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">No intel records found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run analyses to collect competitive intelligence
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

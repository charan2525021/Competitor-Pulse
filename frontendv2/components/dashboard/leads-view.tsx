"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Search, 
  Download, 
  Trash2, 
  Users, 
  Mail,
  Linkedin,
  Building2,
  Loader2
} from "lucide-react"
import type { Lead } from "@/lib/types"

export function LeadsView() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = React.useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearch = async () => {
    if (!searchQuery) return
    
    setIsSearching(true)
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      })
      const data = await response.json()
      setLeads(data.leads || [])
      setSelectedLeads(new Set())
    } catch (error) {
      console.error("Failed to search leads:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLeads(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  const deleteSelected = () => {
    setLeads(leads.filter(l => !selectedLeads.has(l.id)))
    setSelectedLeads(new Set())
  }

  const exportLeads = () => {
    const selectedData = leads.filter(l => selectedLeads.has(l.id))
    const csv = [
      ["Name", "Title", "Company", "Email", "LinkedIn", "Confidence"],
      ...selectedData.map(l => [l.name, l.title, l.company, l.email, l.linkedIn || "", `${l.confidence}%`])
    ].map(row => row.join(",")).join("\n")
    
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "leads.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-emerald-500"
    if (confidence >= 75) return "text-primary"
    return "text-amber-500"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead Generation</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered lead discovery with email suggestions
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {leads.length} Leads Found
        </Badge>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Search Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="e.g., VP of Sales at SaaS companies in San Francisco"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery} className="gap-2">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {leads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Results</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportLeads}
                  disabled={selectedLeads.size === 0}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deleteSelected}
                  disabled={selectedLeads.size === 0}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead className="w-20">Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {lead.company}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${getConfidenceColor(lead.confidence)}`}>
                        {lead.confidence}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {lead.linkedIn && (
                        <a 
                          href={lead.linkedIn} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Linkedin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {leads.length === 0 && !isSearching && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">No leads yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Search for leads to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

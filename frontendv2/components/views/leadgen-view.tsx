"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import {
  Search,
  Download,
  Mail,
  Linkedin,
  Building2,
  MapPin,
  Briefcase,
  Check,
  Loader2,
  UserPlus,
  Filter,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle2
} from "lucide-react"
import type { Lead } from "@/lib/types"

// Mock leads data
const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Sarah Chen",
    title: "VP of Engineering",
    company: "TechCorp",
    email: "s.chen@techcorp.com",
    emailConfidence: 95,
    linkedinUrl: "https://linkedin.com/in/sarachen",
    location: "San Francisco, CA",
    industry: "Technology",
  },
  {
    id: "2",
    name: "Michael Roberts",
    title: "Head of Product",
    company: "InnovateCo",
    email: "m.roberts@innovateco.io",
    emailConfidence: 88,
    linkedinUrl: "https://linkedin.com/in/mroberts",
    location: "New York, NY",
    industry: "SaaS",
  },
  {
    id: "3",
    name: "Emily Watson",
    title: "Director of Strategy",
    company: "GrowthLabs",
    email: "emily.w@growthlabs.com",
    emailConfidence: 92,
    linkedinUrl: "https://linkedin.com/in/emilywatson",
    location: "Austin, TX",
    industry: "Marketing",
  },
  {
    id: "4",
    name: "David Kim",
    title: "CTO",
    company: "DataFlow",
    email: "dkim@dataflow.tech",
    emailConfidence: 85,
    linkedinUrl: "https://linkedin.com/in/davidkim",
    location: "Seattle, WA",
    industry: "Data Analytics",
  },
  {
    id: "5",
    name: "Jessica Taylor",
    title: "Sales Director",
    company: "CloudBase",
    email: "j.taylor@cloudbase.io",
    emailConfidence: 90,
    linkedinUrl: "https://linkedin.com/in/jessicataylor",
    location: "Boston, MA",
    industry: "Cloud Infrastructure",
  },
]

export function LeadGenView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!companyFilter) {
      // If no company specified, filter existing leads
      setLeads(mockLeads.filter(lead => {
        const matchesSearch = !searchQuery || 
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = !roleFilter || 
          lead.title.toLowerCase().includes(roleFilter.toLowerCase())
        return matchesSearch && matchesRole
      }))
      return
    }

    setIsSearching(true)
    try {
      // Call AI API to generate leads
      const response = await fetch("/api/ai/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyFilter,
          title: roleFilter,
          industry: "",
          location: "",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.leads && data.leads.length > 0) {
          setLeads(data.leads.map((lead: Lead, index: number) => ({
            ...lead,
            id: lead.id || String(index + 1),
          })))
        }
      }
    } catch (error) {
      console.error("Lead search error:", error)
      // Fall back to mock data
      setLeads(mockLeads)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLeads(newSelected)
  }

  const selectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const exportLeads = () => {
    const selectedData = leads.filter(l => selectedLeads.has(l.id))
    const csv = [
      ["Name", "Title", "Company", "Email", "Confidence", "LinkedIn", "Location"].join(","),
      ...selectedData.map(l => [
        l.name,
        l.title,
        l.company,
        l.email,
        `${l.emailConfidence}%`,
        l.linkedinUrl,
        l.location
      ].join(","))
    ].join("\n")
    
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "leads-export.csv"
    a.click()
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
          <h1 className="text-2xl font-bold">Lead Generation</h1>
          <p className="text-muted-foreground">Find and export decision-maker contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <UserPlus className="mr-1 h-3 w-3" />
            {leads.length} leads found
          </Badge>
        </div>
      </div>

      {/* Search & Filters */}
      <ScrollReveal delay={100}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Company"
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="pl-10 w-40"
                    />
                  </div>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Role"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="pl-10 w-40"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Results Table */}
      <ScrollReveal delay={200}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search Results</CardTitle>
              <div className="flex items-center gap-2">
                {selectedLeads.size > 0 && (
                  <Button variant="default" size="sm" onClick={exportLeads}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected ({selectedLeads.size})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leads.map((lead, index) => (
                <div
                  key={lead.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-all",
                    selectedLeads.has(lead.id) 
                      ? "bg-primary/5 border-primary/30" 
                      : "bg-card hover:bg-muted/50 border-border"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectLead(lead.id)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                      selectedLeads.has(lead.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {selectedLeads.has(lead.id) && <Check className="h-3 w-3" />}
                  </button>

                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                    {lead.name.split(" ").map(n => n[0]).join("")}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{lead.name}</h4>
                      {lead.linkedinUrl && (
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0077B5] hover:opacity-80"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {lead.title} at {lead.company}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {lead.location}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono">{lead.email}</span>
                        <button
                          onClick={() => copyEmail(lead.email || "")}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedEmail === lead.email ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={cn("text-xs font-medium", getConfidenceColor(lead.emailConfidence || 0))}>
                          {lead.emailConfidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {leads.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leads found. Try adjusting your search criteria.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import { LiveLogs } from "@/components/live-logs"
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
  ExternalLink,
  Copy,
  CheckCircle2,
  Square,
  Send,
  Trash2,
  Plus,
  Clock,
  Megaphone,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from "lucide-react"
import type { Lead } from "@/lib/types"
import {
  startLeadSearch, createLeadLogStream, cancelLeadSearch,
  saveSenderIdentity, getSenderIdentities, deleteSenderApi, updateSenderApi,
  createCampaignApi, getCampaignsApi, deleteCampaignApi, sendCampaignApi, getCampaignLogsApi,
  updateCampaignApi, addCampaignRecipientsApi, removeCampaignRecipientApi,
  loadCollection,
} from "@/lib/api"
import { saveLead, addHistoryItem, getLeads } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface LogEntry {
  id: string
  type: string
  message: string
  timestamp: string
}

interface Sender {
  id: string
  fromName: string
  fromEmail: string
  useGmailSmtp: boolean
}

interface CampaignRecipient {
  leadId: string
  name: string
  email: string
  company: string
  role: string
  status: "pending" | "sent" | "failed"
  error?: string
  sentAt?: string
}

interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  senderId: string
  leads: any[]
  recipients?: CampaignRecipient[]
  status?: string
  sentAt?: string
  stats?: { total: number; sent: number; failed: number }
}

export function LeadGenView() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [editingEmail, setEditingEmail] = useState("")
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const prevSearchingRef = useRef(false)

  // Outreach state
  const [activeTab, setActiveTab] = useState<"search" | "outreach" | "campaigns">("search")
  const [senders, setSenders] = useState<Sender[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [newSender, setNewSender] = useState({ fromName: "", fromEmail: "", gmailAppPassword: "", useGmailSmtp: false })
  const [showSenderForm, setShowSenderForm] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", body: "", senderId: "" })
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null)
  const [campaignLogs, setCampaignLogs] = useState<Record<string, string[]>>({})
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [editingSenderId, setEditingSenderId] = useState<string | null>(null)
  const [editingSender, setEditingSender] = useState({ fromName: "", fromEmail: "" })
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [editingCampaignData, setEditingCampaignData] = useState({ name: "", subject: "", body: "", senderId: "" })
  const [addRecipientsId, setAddRecipientsId] = useState<string | null>(null)
  const [manualRecipient, setManualRecipient] = useState({ name: "", email: "", company: "", role: "" })
  const [recipientSearch, setRecipientSearch] = useState("")

  // Load previously saved leads from localStorage on mount
  useEffect(() => {
    const saved = getLeads()
    if (saved.length > 0) setLeads(saved)
  }, [])

  useEffect(() => {
    if (activeTab === "outreach") {
      getSenderIdentities().then(res => res.success && setSenders(res.senders || []))
    }
    if (activeTab === "campaigns") {
      getCampaignsApi().then(res => res.success && setCampaigns(res.campaigns || []))
      getSenderIdentities().then(res => res.success && setSenders(res.senders || []))
    }
  }, [activeTab])

  // Load lead gen history on mount
  useEffect(() => {
    loadCollection("leadgenHistory").then(data => {
      if (Array.isArray(data)) setHistoryItems(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    })
  }, [])

  // Refresh history when search finishes
  useEffect(() => {
    if (prevSearchingRef.current && !isSearching) {
      loadCollection("leadgenHistory").then(data => {
        if (Array.isArray(data)) setHistoryItems(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      })
    }
    prevSearchingRef.current = isSearching
  }, [isSearching])

  const handleSearch = async () => {
    if (!searchQuery) return
    setIsSearching(true)
    setLogs([])
    setLeads([])

    const currentQuery = searchQuery

    try {
      const res = await startLeadSearch(searchQuery)
      if (res.runId) {
        setRunId(res.runId)
        const es = createLeadLogStream(
          res.runId,
          (data) => {
            if (data.message) {
              setLogs(prev => [...prev, {
                id: `${Date.now()}-${Math.random()}`,
                type: data.level || data.type || "info",
                message: data.message,
                timestamp: new Date().toLocaleTimeString(),
              }])
            }
          },
          (resultLeads) => {
            setIsSearching(false)
            if (resultLeads && resultLeads.length > 0) {
              const mapped = resultLeads.map((l: any, i: number) => ({
                id: l.id || String(i + 1),
                name: l.name || "Unknown",
                title: l.title || l.role || "",
                company: l.company || "",
                email: l.email || "",
                emailConfidence: l.emailConfidence || 0,
                emailSuggestions: l.emailSuggestions || [],
                linkedinUrl: l.linkedinUrl || "",
                location: l.location || "",
                industry: l.industry || "",
              }))
              setLeads(mapped)

              // Persist each lead to localStorage
              mapped.forEach((lead: Lead) => saveLead(lead))

              // Record history entry locally
              addHistoryItem({
                id: `hist-${Date.now()}`,
                type: "lead",
                action: "Lead Generation",
                target: currentQuery,
                timestamp: new Date().toISOString(),
                status: "success",
                details: `Found ${mapped.length} leads`,
              })
            } else {
              // Record failed/empty search
              addHistoryItem({
                id: `hist-${Date.now()}`,
                type: "lead",
                action: "Lead Generation",
                target: currentQuery,
                timestamp: new Date().toISOString(),
                status: "failed",
                details: "No leads found",
              })
            }
          }
        )
        esRef.current = es
      }
    } catch (err) {
      setIsSearching(false)
      setLogs(prev => [...prev, {
        id: `${Date.now()}`,
        type: "error",
        message: `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toLocaleTimeString(),
      }])
      // Record failed search in history
      addHistoryItem({
        id: `hist-${Date.now()}`,
        type: "lead",
        action: "Lead Generation",
        target: currentQuery,
        timestamp: new Date().toISOString(),
        status: "failed",
        details: `Search failed`,
      })
    }
  }

  const handleCancel = async () => {
    if (runId) {
      await cancelLeadSearch(runId)
      esRef.current?.close()
      setIsSearching(false)
    }
  }

  const toggleSelectLead = (id: string) => {
    const s = new Set(selectedLeads)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelectedLeads(s)
  }

  const selectAll = () => {
    setSelectedLeads(selectedLeads.size === leads.length ? new Set() : new Set(leads.map(l => l.id)))
  }

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const exportLeads = () => {
    const selected = leads.filter(l => selectedLeads.has(l.id))
    const csv = [
      ["Name", "Title", "Company", "Email", "Confidence", "LinkedIn", "Location"].join(","),
      ...selected.map(l => [l.name, l.title, l.company, l.email, `${l.emailConfidence}%`, l.linkedinUrl, l.location].join(","))
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "leads-export.csv"
    a.click()
  }

  const handleAddSender = async () => {
    const res = await saveSenderIdentity(newSender.fromName, newSender.fromEmail, newSender.useGmailSmtp, newSender.gmailAppPassword || undefined)
    if (res.success && res.sender) {
      setSenders(prev => [...prev, { id: res.sender.id, fromName: res.sender.fromName, fromEmail: res.sender.fromEmail, useGmailSmtp: res.sender.useGmailSmtp }])
      setNewSender({ fromName: "", fromEmail: "", gmailAppPassword: "", useGmailSmtp: false })
      setShowSenderForm(false)
    }
  }

  const handleDeleteSender = async (id: string) => {
    await deleteSenderApi(id)
    setSenders(prev => prev.filter(s => s.id !== id))
  }

  const handleEditSender = async () => {
    if (!editingSenderId) return
    const res = await updateSenderApi(editingSenderId, { fromName: editingSender.fromName, fromEmail: editingSender.fromEmail, useGmailSmtp: false })
    if (res.success && res.sender) {
      setSenders(prev => prev.map(s => s.id === editingSenderId ? { ...s, fromName: res.sender.fromName, fromEmail: res.sender.fromEmail } : s))
      setEditingSenderId(null)
    }
  }

  const handleEditCampaign = async () => {
    if (!editingCampaignId) return
    const res = await updateCampaignApi(editingCampaignId, editingCampaignData)
    if (res.success && res.campaign) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? res.campaign : c))
      setEditingCampaignId(null)
    }
  }

  const handleAddManualRecipient = async (campaignId: string) => {
    if (!manualRecipient.name || !manualRecipient.email) return
    const res = await addCampaignRecipientsApi(campaignId, [{ id: `manual_${Date.now()}`, ...manualRecipient }])
    if (res.success && res.campaign) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? res.campaign : c))
      setManualRecipient({ name: "", email: "", company: "", role: "" })
    }
  }

  const handleAddSelectedLeadsToCampaign = async (campaignId: string) => {
    const selectedLeadData = leads.filter(l => selectedLeads.has(l.id) && l.email)
    if (selectedLeadData.length === 0) return
    const res = await addCampaignRecipientsApi(campaignId, selectedLeadData)
    if (res.success && res.campaign) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? res.campaign : c))
      toast({ title: "Recipients added", description: `Added ${selectedLeadData.length} lead(s) to campaign` })
    }
  }

  const handleRemoveRecipient = async (campaignId: string, email: string) => {
    const res = await removeCampaignRecipientApi(campaignId, email)
    if (res.success && res.campaign) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? res.campaign : c))
    }
  }

  const handleCreateCampaign = async () => {
    const selectedLeadData = leads.filter(l => selectedLeads.has(l.id))
    if (selectedLeadData.length === 0) return
    const res = await createCampaignApi({
      name: newCampaign.name,
      subject: newCampaign.subject,
      body: newCampaign.body,
      senderId: newCampaign.senderId,
      leads: selectedLeadData,
    })
    if (res.success && res.campaign) {
      setCampaigns(prev => [...prev, res.campaign])
      setNewCampaign({ name: "", subject: "", body: "", senderId: "" })
      setShowCampaignForm(false)
    }
  }

  const handleSendCampaign = async (id: string) => {
    setSendingCampaignId(id)
    try {
      const result = await sendCampaignApi(id)
      // Fetch updated campaign with per-recipient status
      const updated = await getCampaignsApi()
      if (updated.success) setCampaigns(updated.campaigns || [])
      // Fetch send logs
      const logsRes = await getCampaignLogsApi(id)
      if (logsRes.success) setCampaignLogs(prev => ({ ...prev, [id]: logsRes.logs || [] }))
      setExpandedCampaignId(id)
      if (result.success) {
        const camp = updated.campaigns?.find((c: Campaign) => c.id === id)
        toast({
          title: "Campaign sent",
          description: `${camp?.stats?.sent || 0} delivered, ${camp?.stats?.failed || 0} failed out of ${camp?.stats?.total || 0} recipients`,
        })
      } else {
        toast({ title: "Campaign failed", description: result.error || "Unknown error", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Send error", description: err.message, variant: "destructive" })
    } finally {
      setSendingCampaignId(null)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaignApi(id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const getConfidenceColor = (c: number) => c >= 90 ? "text-emerald-500" : c >= 75 ? "text-amber-500" : "text-rose-500"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Generation</h1>
          <p className="text-muted-foreground">Find decision-makers and run outreach campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={activeTab === "search" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("search")}>
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
          <Button variant={activeTab === "outreach" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("outreach")}>
            <Mail className="mr-2 h-4 w-4" /> Senders
          </Button>
          <Button variant={activeTab === "campaigns" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("campaigns")}>
            <Megaphone className="mr-2 h-4 w-4" /> Campaigns
          </Button>
        </div>
      </div>

      {activeTab === "search" && (
        <>
          {/* Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Describe who you're looking for (e.g., 'VP Engineering at SaaS companies in SF')"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      disabled={isSearching}
                      onKeyDown={(e) => e.key === "Enter" && !isSearching && handleSearch()}
                    />
                  </div>
                  {isSearching ? (
                    <Button variant="destructive" onClick={handleCancel}>
                      <Square className="mr-2 h-4 w-4" /> Stop
                    </Button>
                  ) : (
                    <Button onClick={handleSearch} disabled={!searchQuery}>
                      <Search className="mr-2 h-4 w-4" /> Search
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

          {/* Live Logs */}
          {(isSearching || logs.length > 0) && (
            <LiveLogs
              logs={logs}
              isRunning={isSearching}
              title="lead-search"
              maxHeight="250px"
            />
          )}

          {/* Results */}
          {leads.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <UserPlus className="inline mr-2 h-5 w-5" />
                      {leads.length} Leads Found
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedLeads.size > 0 && (
                        <>
                          <Button variant="default" size="sm" onClick={exportLeads}>
                            <Download className="mr-2 h-4 w-4" /> Export ({selectedLeads.size})
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setActiveTab("campaigns"); setShowCampaignForm(true) }}>
                            <Send className="mr-2 h-4 w-4" /> Create Campaign
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leads.map((lead) => (
                      <div
                        key={lead.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border transition-all",
                          selectedLeads.has(lead.id) ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50 border-border"
                        )}
                      >
                        <button
                          onClick={() => toggleSelectLead(lead.id)}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                            selectedLeads.has(lead.id) ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
                          )}
                        >
                          {selectedLeads.has(lead.id) && <Check className="h-3 w-3" />}
                        </button>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                          {lead.name.split(" ").map(n => n[0]).join("")}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">{lead.name}</h4>
                            {lead.linkedinUrl && (
                              <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#0077B5] hover:opacity-80">
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{lead.title} at {lead.company}</p>
                        </div>

                        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {lead.location}
                        </div>

                        <div className="flex flex-col items-end gap-1 relative">
                          {editingLeadId === lead.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="email"
                                  value={editingEmail}
                                  onChange={(e) => setEditingEmail(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && editingEmail) {
                                      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, email: editingEmail, emailConfidence: 100, emailSuggestions: l.emailSuggestions } : l))
                                      setEditingLeadId(null)
                                    }
                                    if (e.key === "Escape") setEditingLeadId(null)
                                  }}
                                  className="h-7 w-52 text-xs"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    if (editingEmail) {
                                      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, email: editingEmail, emailConfidence: 100, emailSuggestions: l.emailSuggestions } : l))
                                    }
                                    setEditingLeadId(null)
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingLeadId(null)}>
                                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-mono">{lead.email || "No email"}</span>
                                {lead.emailConfidence != null && lead.emailConfidence > 0 && (
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getConfidenceColor(lead.emailConfidence))}>
                                    {lead.emailConfidence}%
                                  </Badge>
                                )}
                                <button
                                  onClick={() => { setEditingLeadId(lead.id); setEditingEmail(lead.email || "") }}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Edit email"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {lead.email && (
                                  <button onClick={() => copyEmail(lead.email || "")} className="text-muted-foreground hover:text-foreground">
                                    {copiedEmail === lead.email ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                              {(lead.emailSuggestions?.length ?? 0) > 1 && (
                                <button
                                  onClick={() => setExpandedEmailId(expandedEmailId === lead.id ? null : lead.id)}
                                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  {expandedEmailId === lead.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {lead.emailSuggestions!.length - 1} more suggestion{lead.emailSuggestions!.length - 1 !== 1 ? "s" : ""}
                                </button>
                              )}
                              {expandedEmailId === lead.id && lead.emailSuggestions && (
                                <div className="absolute top-full right-0 mt-1 z-20 bg-popover border rounded-lg shadow-lg p-2 min-w-[280px]">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Email Suggestions</p>
                                  {lead.emailSuggestions.map((s, si) => (
                                    <button
                                      key={si}
                                      onClick={() => {
                                        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, email: s.email, emailConfidence: s.confidence } : l))
                                        setExpandedEmailId(null)
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded text-left hover:bg-muted/70 transition-colors",
                                        s.email === lead.email && "bg-primary/10"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {s.email === lead.email && <Check className="h-3 w-3 text-primary shrink-0" />}
                                        <span className="text-xs font-mono truncate">{s.email}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-muted-foreground">{s.pattern}</span>
                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getConfidenceColor(s.confidence))}>
                                          {s.confidence}%
                                        </Badge>
                                      </div>
                                    </button>
                                  ))}
                                  <div className="border-t mt-1.5 pt-1.5">
                                    <button
                                      onClick={() => { setEditingLeadId(lead.id); setEditingEmail(lead.email || ""); setExpandedEmailId(null) }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-muted/70 transition-colors text-xs text-muted-foreground"
                                    >
                                      <Pencil className="h-3 w-3" /> Enter custom email
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Collapsible History */}
          <Card>
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Search History</span>
                {historyItems.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{historyItems.length}</Badge>
                )}
              </div>
              {historyExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {historyExpanded && (
              <CardContent className="pt-0 pb-4">
                {historyItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No search history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyItems.map((item: any) => {
                      const isOpen = expandedHistoryId === item.id
                      const leads: any[] = item.leads || []
                      return (
                        <div key={item.id} className="rounded-lg border bg-card overflow-hidden">
                          <button
                            onClick={() => setExpandedHistoryId(isOpen ? null : item.id)}
                            className="w-full flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors"
                          >
                            {item.status === "complete" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-medium text-sm truncate">{item.query}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString()} &middot; {item.leadsCount || leads.length || 0} leads found
                              </p>
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-xs shrink-0",
                              item.status === "complete" ? "text-emerald-500 border-emerald-500/30" : "text-rose-500 border-rose-500/30"
                            )}>
                              {item.status}
                            </Badge>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                          </button>

                          {isOpen && leads.length > 0 && (
                            <div className="px-3 pb-3">
                              <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/50 text-left">
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Name</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Company</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Role</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Email</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">LinkedIn</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {leads.map((lead: any, li: number) => (
                                      <tr key={li} className="border-t hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-2 font-medium">
                                          <div className="flex items-center gap-2">
                                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="truncate max-w-[120px]">{lead.name || "—"}</span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-1.5">
                                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="truncate max-w-[100px] text-muted-foreground">{lead.company || "—"}</span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <Badge variant="secondary" className="text-[10px]">{lead.title || lead.role || "—"}</Badge>
                                        </td>
                                        <td className="px-3 py-2">
                                          {lead.email ? (
                                            <a href={`mailto:${lead.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                              <Mail className="h-3 w-3 shrink-0" />
                                              <span className="truncate max-w-[140px]">{lead.email}</span>
                                            </a>
                                          ) : lead.possibleEmails?.length > 0 ? (
                                            <span className="text-xs text-muted-foreground">{lead.possibleEmails[0]}</span>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          {lead.linkedinUrl ? (
                                            <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                              className="text-xs text-primary hover:underline flex items-center gap-1">
                                              <Linkedin className="h-3 w-3 shrink-0" />
                                              <span>Profile</span>
                                              <ExternalLink className="h-2.5 w-2.5" />
                                            </a>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {isOpen && leads.length === 0 && (
                            <div className="px-3 pb-3 text-center py-4 text-muted-foreground text-xs">
                              No lead data available for this search
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}

      {activeTab === "outreach" && (
        <ScrollReveal delay={100}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sender Identities</CardTitle>
                <Button size="sm" onClick={() => setShowSenderForm(!showSenderForm)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Sender
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showSenderForm && (
                <div className="mb-6 p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="From Name" value={newSender.fromName} onChange={e => setNewSender({...newSender, fromName: e.target.value})} />
                    <Input placeholder="From Email" type="email" value={newSender.fromEmail} onChange={e => setNewSender({...newSender, fromEmail: e.target.value})} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SMTP credentials are configured via environment variables (SMTP_USER, SMTP_PASS in .env). No need to enter them here.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowSenderForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddSender} disabled={!newSender.fromName || !newSender.fromEmail}>Save</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {senders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No sender identities yet</p>
                  </div>
                ) : senders.map((sender) => (
                  <div key={sender.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    {editingSenderId === sender.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input className="h-8 text-sm" placeholder="Name" value={editingSender.fromName} onChange={e => setEditingSender({ ...editingSender, fromName: e.target.value })} />
                        <Input className="h-8 text-sm" placeholder="Email" value={editingSender.fromEmail} onChange={e => setEditingSender({ ...editingSender, fromEmail: e.target.value })} />
                        <Button size="sm" className="h-8" onClick={handleEditSender}><Check className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingSenderId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{sender.fromName}</p>
                            <p className="text-sm text-muted-foreground">{sender.fromEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sender.useGmailSmtp && <Badge variant="outline" className="text-xs">Gmail SMTP</Badge>}
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingSenderId(sender.id)
                            setEditingSender({ fromName: sender.fromName, fromEmail: sender.fromEmail })
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSender(sender.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {activeTab === "campaigns" && (
        <ScrollReveal delay={100}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Email Campaigns</CardTitle>
                <Button size="sm" onClick={() => setShowCampaignForm(!showCampaignForm)}>
                  <Plus className="mr-2 h-4 w-4" /> New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showCampaignForm && (
                <div className="mb-6 p-4 rounded-lg border bg-muted/30 space-y-3">
                  <Input placeholder="Campaign Name" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} />
                  <Input placeholder="Email Subject" value={newCampaign.subject} onChange={e => setNewCampaign({...newCampaign, subject: e.target.value})} />
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Email body (use {{name}}, {{company}}, {{title}} for personalization)"
                    value={newCampaign.body}
                    onChange={e => setNewCampaign({...newCampaign, body: e.target.value})}
                  />
                  <select
                    value={newCampaign.senderId}
                    onChange={e => setNewCampaign({...newCampaign, senderId: e.target.value})}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select sender...</option>
                    {senders.map(s => <option key={s.id} value={s.id}>{s.fromName} ({s.fromEmail})</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {selectedLeads.size > 0 ? `${selectedLeads.size} leads selected from search results` : "Select leads from the Search tab first"}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCampaignForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateCampaign} disabled={!newCampaign.name || !newCampaign.subject || !newCampaign.senderId || selectedLeads.size === 0}>
                      Create Campaign
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No campaigns yet</p>
                  </div>
                ) : campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-4 rounded-lg border bg-card space-y-3">
                    {/* Inline edit form */}
                    {editingCampaignId === campaign.id ? (
                      <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                        <Input placeholder="Campaign Name" value={editingCampaignData.name} onChange={e => setEditingCampaignData({...editingCampaignData, name: e.target.value})} />
                        <Input placeholder="Email Subject" value={editingCampaignData.subject} onChange={e => setEditingCampaignData({...editingCampaignData, subject: e.target.value})} />
                        <textarea
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Email body (use {{name}}, {{company}}, {{first_name}} for personalization)"
                          value={editingCampaignData.body}
                          onChange={e => setEditingCampaignData({...editingCampaignData, body: e.target.value})}
                        />
                        <select
                          value={editingCampaignData.senderId}
                          onChange={e => setEditingCampaignData({...editingCampaignData, senderId: e.target.value})}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Select sender...</option>
                          {senders.map(s => <option key={s.id} value={s.id}>{s.fromName} ({s.fromEmail})</option>)}
                        </select>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingCampaignId(null)}>Cancel</Button>
                          <Button size="sm" onClick={handleEditCampaign}>Save Changes</Button>
                        </div>
                      </div>
                    ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <p className="text-sm text-muted-foreground">{campaign.subject} &middot; {campaign.recipients?.length || campaign.leads?.length || 0} recipients</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          campaign.status === "sent" ? "text-emerald-500 border-emerald-500/30" :
                          campaign.status === "failed" ? "text-rose-500 border-rose-500/30" :
                          campaign.status === "sending" ? "text-blue-500 border-blue-500/30" :
                          "text-amber-500 border-amber-500/30"
                        )}>
                          {campaign.status === "sent" ? "Sent" : campaign.status === "failed" ? "Failed" : campaign.status === "sending" ? "Sending..." : "Draft"}
                        </Badge>
                        {campaign.status !== "sent" && campaign.status !== "sending" && (
                          <>
                            <Button size="sm" onClick={() => handleSendCampaign(campaign.id)} disabled={sendingCampaignId === campaign.id}>
                              {sendingCampaignId === campaign.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
                              {sendingCampaignId === campaign.id ? "Sending..." : "Send"}
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingCampaignId(campaign.id)
                          setEditingCampaignData({ name: campaign.name, subject: campaign.subject, body: campaign.body || "", senderId: campaign.senderId || "" })
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCampaign(campaign.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    )}

                    {/* Stats bar */}
                    {campaign.stats && (campaign.status === "sent" || campaign.status === "failed") && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Total: <strong>{campaign.stats.total}</strong></span>
                        <span className="text-emerald-500">Delivered: <strong>{campaign.stats.sent}</strong></span>
                        <span className="text-rose-500">Failed: <strong>{campaign.stats.failed}</strong></span>
                        {campaign.sentAt && <span className="text-muted-foreground text-xs">Sent {new Date(campaign.sentAt).toLocaleString()}</span>}
                      </div>
                    )}

                    {/* Expanded details: per-recipient status + logs */}
                    {expandedCampaignId === campaign.id && (
                      <div className="space-y-3 pt-2 border-t">
                        {/* Per-recipient list with search and delete */}
                        {campaign.recipients && campaign.recipients.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Recipients ({campaign.recipients.length})
                              </p>
                            </div>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                className="h-8 text-sm pl-8"
                                placeholder="Search recipients by name or email..."
                                value={recipientSearch}
                                onChange={e => setRecipientSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-1">
                              {campaign.recipients
                                .filter(r => {
                                  if (!recipientSearch) return true
                                  const q = recipientSearch.toLowerCase()
                                  return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.company || "").toLowerCase().includes(q)
                                })
                                .map((r) => (
                                <div key={r.leadId} className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-muted/50 group">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={cn(
                                      "h-2 w-2 rounded-full shrink-0",
                                      r.status === "sent" ? "bg-emerald-500" : r.status === "failed" ? "bg-rose-500" : "bg-amber-500"
                                    )} />
                                    <span className="font-medium truncate">{r.name}</span>
                                    <span className="text-muted-foreground truncate">&lt;{r.email}&gt;</span>
                                    {r.company && <span className="text-xs text-muted-foreground hidden sm:inline">· {r.company}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className={cn(
                                      "text-xs",
                                      r.status === "sent" ? "text-emerald-500 border-emerald-500/30" :
                                      r.status === "failed" ? "text-rose-500 border-rose-500/30" :
                                      "text-amber-500 border-amber-500/30"
                                    )}>
                                      {r.status === "sent" ? "Delivered" : r.status === "failed" ? "Failed" : "Pending"}
                                    </Badge>
                                    {r.sentAt && <span className="text-xs text-muted-foreground">{new Date(r.sentAt).toLocaleTimeString()}</span>}
                                    {campaign.status !== "sending" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveRecipient(campaign.id, r.email)}
                                      >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-rose-500" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {campaign.recipients.some(r => r.status === "failed" && r.error) && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-medium text-rose-500">Errors:</p>
                                {campaign.recipients.filter(r => r.status === "failed" && r.error).map(r => (
                                  <p key={r.leadId} className="text-xs text-rose-400 pl-2">{r.name}: {r.error}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SMTP Logs */}
                        {campaignLogs[campaign.id] && campaignLogs[campaign.id].length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send Logs</p>
                            <div className="max-h-40 overflow-y-auto rounded bg-muted/50 p-2 font-mono text-xs space-y-0.5">
                              {campaignLogs[campaign.id].map((log, i) => (
                                <p key={i} className={cn(
                                  log.includes("✓") ? "text-emerald-500" : log.includes("✗") || log.includes("failed") ? "text-rose-500" : "text-muted-foreground"
                                )}>{log}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fetch logs button if not loaded yet */}
                        {!campaignLogs[campaign.id] && (campaign.status === "sent" || campaign.status === "failed") && (
                          <Button variant="outline" size="sm" onClick={async () => {
                            const logsRes = await getCampaignLogsApi(campaign.id)
                            if (logsRes.success) setCampaignLogs(prev => ({ ...prev, [campaign.id]: logsRes.logs || [] }))
                          }}>
                            <Eye className="mr-2 h-3 w-3" /> Load Send Logs
                          </Button>
                        )}

                        {/* Add Recipients section */}
                        {campaign.status !== "sending" && (
                          <div className="space-y-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Recipients</p>

                            {/* Add from search results */}
                            {leads.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">From search results ({selectedLeads.size} selected):</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={selectedLeads.size === 0}
                                  onClick={() => handleAddSelectedLeadsToCampaign(campaign.id)}
                                >
                                  <UserPlus className="mr-2 h-3 w-3" /> Add {selectedLeads.size} Selected Lead{selectedLeads.size !== 1 ? "s" : ""}
                                </Button>
                              </div>
                            )}

                            {/* Manual recipient entry */}
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-8 text-sm"
                                placeholder="Name"
                                value={addRecipientsId === campaign.id ? manualRecipient.name : ""}
                                onFocus={() => setAddRecipientsId(campaign.id)}
                                onChange={e => {
                                  setAddRecipientsId(campaign.id)
                                  setManualRecipient({ ...manualRecipient, name: e.target.value })
                                }}
                              />
                              <Input
                                className="h-8 text-sm"
                                placeholder="Email"
                                value={addRecipientsId === campaign.id ? manualRecipient.email : ""}
                                onFocus={() => setAddRecipientsId(campaign.id)}
                                onChange={e => {
                                  setAddRecipientsId(campaign.id)
                                  setManualRecipient({ ...manualRecipient, email: e.target.value })
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                disabled={!manualRecipient.name || !manualRecipient.email || addRecipientsId !== campaign.id}
                                onClick={() => handleAddManualRecipient(campaign.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

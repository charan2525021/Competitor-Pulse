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
} from "lucide-react"
import type { Lead } from "@/lib/types"
import {
  startLeadSearch, createLeadLogStream, cancelLeadSearch,
  saveSenderIdentity, getSenderIdentities, deleteSenderApi,
  createCampaignApi, getCampaignsApi, deleteCampaignApi, sendCampaignApi, getCampaignLogsApi,
} from "@/lib/api"

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

interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  senderId: string
  leads: any[]
  status?: string
  sentAt?: string
}

export function LeadGenView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  // Outreach state
  const [activeTab, setActiveTab] = useState<"search" | "outreach" | "campaigns">("search")
  const [senders, setSenders] = useState<Sender[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [newSender, setNewSender] = useState({ fromName: "", fromEmail: "", gmailAppPassword: "", useGmailSmtp: false })
  const [showSenderForm, setShowSenderForm] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", body: "", senderId: "" })
  const [showCampaignForm, setShowCampaignForm] = useState(false)

  useEffect(() => {
    if (activeTab === "outreach") {
      getSenderIdentities().then(res => res.success && setSenders(res.senders || []))
    }
    if (activeTab === "campaigns") {
      getCampaignsApi().then(res => res.success && setCampaigns(res.campaigns || []))
    }
  }, [activeTab])

  const handleSearch = async () => {
    if (!searchQuery) return
    setIsSearching(true)
    setLogs([])
    setLeads([])

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
              setLeads(resultLeads.map((l: any, i: number) => ({
                id: l.id || String(i + 1),
                name: l.name || "Unknown",
                title: l.title || "",
                company: l.company || "",
                email: l.email || "",
                emailConfidence: l.emailConfidence || 0,
                linkedinUrl: l.linkedinUrl || "",
                location: l.location || "",
                industry: l.industry || "",
              })))
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
    if (res.success) {
      setSenders(prev => [...prev, { id: res.id || Date.now().toString(), fromName: newSender.fromName, fromEmail: newSender.fromEmail, useGmailSmtp: newSender.useGmailSmtp }])
      setNewSender({ fromName: "", fromEmail: "", gmailAppPassword: "", useGmailSmtp: false })
      setShowSenderForm(false)
    }
  }

  const handleDeleteSender = async (id: string) => {
    await deleteSenderApi(id)
    setSenders(prev => prev.filter(s => s.id !== id))
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
    if (res.success) {
      setCampaigns(prev => [...prev, { ...newCampaign, id: res.id || Date.now().toString(), leads: selectedLeadData }])
      setNewCampaign({ name: "", subject: "", body: "", senderId: "" })
      setShowCampaignForm(false)
    }
  }

  const handleSendCampaign = async (id: string) => {
    await sendCampaignApi(id)
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "sent", sentAt: new Date().toISOString() } : c))
  }

  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaignApi(id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const getConfidenceColor = (c: number) => c >= 90 ? "text-emerald-500" : c >= 75 ? "text-amber-500" : "text-rose-500"

  return (
    <div className="space-y-6">
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
          <ScrollReveal delay={100}>
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
          </ScrollReveal>

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
            <ScrollReveal delay={200}>
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

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-mono">{lead.email}</span>
                              <button onClick={() => copyEmail(lead.email || "")} className="text-muted-foreground hover:text-foreground">
                                {copiedEmail === lead.email ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                            <span className={cn("text-xs font-medium", getConfidenceColor(lead.emailConfidence || 0))}>
                              {lead.emailConfidence}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
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
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newSender.useGmailSmtp} onChange={e => setNewSender({...newSender, useGmailSmtp: e.target.checked})} className="rounded" />
                      Use Gmail SMTP
                    </label>
                    {newSender.useGmailSmtp && (
                      <Input placeholder="Gmail App Password" type="password" value={newSender.gmailAppPassword} onChange={e => setNewSender({...newSender, gmailAppPassword: e.target.value})} className="flex-1" />
                    )}
                  </div>
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
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSender(sender.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                  <div key={campaign.id} className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <p className="text-sm text-muted-foreground">{campaign.subject} &middot; {campaign.leads?.length || 0} recipients</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          campaign.status === "sent" ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"
                        )}>
                          {campaign.status === "sent" ? "Sent" : "Draft"}
                        </Badge>
                        {campaign.status !== "sent" && (
                          <Button size="sm" onClick={() => handleSendCampaign(campaign.id)}>
                            <Send className="mr-2 h-3 w-3" /> Send
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCampaign(campaign.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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

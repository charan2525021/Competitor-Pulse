import { useState, useEffect, useRef } from "react";
import {
  Users, Search, Trash2, Mail, Send, Plus, Loader2,
  UserPlus, XCircle, ExternalLink, Table2, Edit3, Check, ChevronDown, ChevronUp,
  Clock, Megaphone, CheckCircle2, Eye, User,
  X, RefreshCw,
} from "lucide-react";
import { LiveLogs } from "../components/LiveLogs";
import { HistoryPanel } from "../components/HistoryPanel";
import type { HistoryPanelItem } from "../components/HistoryPanel";
import {
  startLeadSearch, createLeadLogStream, fetchLeadResults, cancelLeadSearch,
  saveSenderIdentity, getSenderIdentities, deleteSenderApi,
  createCampaignApi, getCampaignsApi, deleteCampaignApi, sendCampaignApi, getCampaignLogsApi,
} from "../services/api";
import type { LogEntry } from "../hooks/useAgentLogs";
import { ScrollReveal } from "../components/ScrollReveal";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface Lead {
  id: string; name: string; company: string; role: string; email: string;
  possibleEmails?: string[]; linkedinUrl?: string; addedAt: string;
}
export interface LeadSearchHistory {
  id: string; query: string; timestamp: string; leadCount: number; status: "running" | "done" | "failed";
}

interface SenderItem { id: string; fromName: string; fromEmail: string; useGmailSmtp: boolean; gmailAppPassword?: string; }
interface CampaignItem {
  id: string; name: string; subject: string; body: string; senderId: string;
  status: "draft" | "sending" | "sent" | "failed"; createdAt: string; sentAt?: string;
  recipients: { leadId: string; name: string; email: string; company: string; role: string; status: string; error?: string; sentAt?: string }[];
  stats: { total: number; sent: number; failed: number };
}

interface LeadGenProps {
  leads: Lead[]; setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  leadHistory: LeadSearchHistory[]; setLeadHistory: React.Dispatch<React.SetStateAction<LeadSearchHistory[]>>;
  onDeleteHistory: (id: string) => void; leadRunId: string | null; setLeadRunId: (id: string | null) => void;
  onLeadsReady: (leads: Lead[], query: string) => void; isAdmin?: boolean;
}

export function LeadGen({ leads, setLeads, leadHistory, setLeadHistory, onDeleteHistory, leadRunId, setLeadRunId, onLeadsReady, isAdmin }: LeadGenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  // Campaign state
  const [activeTab, setActiveTab] = useState<"leads" | "campaigns">("leads");
  const [senders, setSenders] = useState<SenderItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [showSenderForm, setShowSenderForm] = useState(false);
  const [senderForm, setSenderForm] = useState({ fromName: "", fromEmail: "", useGmailSmtp: false, gmailAppPassword: "" });
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: "", subject: "", body: "", senderId: "" });
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<CampaignItem | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<string[]>([]);

  useEffect(() => {
    getSenderIdentities().then((r) => { if (r.success) setSenders(r.senders); });
    getCampaignsApi().then((r) => { if (r.success) setCampaigns(r.campaigns); });
  }, []);

  // ── Lead search logic ──
  useEffect(() => {
    if (!leadRunId) return;
    setIsSearching(true); setLogs([]);
    const es = createLeadLogStream(leadRunId,
      (msg) => { setLogs((prev) => [...prev, { ...msg, timestamp: new Date().toISOString() }]); },
      async (incomingLeads) => {
        setIsSearching(false);
        let finalLeads: Lead[] = [];
        if (incomingLeads?.length) finalLeads = incomingLeads;
        else { try { const res = await fetchLeadResults(leadRunId); if (res.success && res.leads?.length) finalLeads = res.leads; } catch {} }
        if (finalLeads.length > 0) {
          setSearchResults(finalLeads);
          setStatusMsg(`Found ${finalLeads.length} lead${finalLeads.length !== 1 ? "s" : ""}`);
          setLeads((prev) => { const existing = new Set(prev.map((l) => `${l.name}|${l.company}`.toLowerCase())); return [...finalLeads.filter((l) => !existing.has(`${l.name}|${l.company}`.toLowerCase())), ...prev]; });
          setLeadHistory((prev) => prev.map((h) => h.id === leadRunId || h.status === "running" ? { ...h, leadCount: finalLeads.length, status: "done" as const } : h));
          onLeadsReady(finalLeads, leadHistory.find((h) => h.status === "running")?.query || "Lead Search");
        } else {
          setStatusMsg("No leads found."); setLeadHistory((prev) => prev.map((h) => h.status === "running" ? { ...h, status: "done" as const } : h));
        }
        setLeadRunId(null);
      }
    );
    esRef.current = es;
    return () => {};
  }, [leadRunId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true); setSearchResults([]); setStatusMsg(""); setLogs([]);
    const historyId = crypto.randomUUID();
    setLeadHistory((prev) => [{ id: historyId, query: searchQuery, timestamp: new Date().toISOString(), leadCount: 0, status: "running" as const }, ...prev]);
    try {
      const data = await startLeadSearch(searchQuery);
      if (!data.success || !data.runId) { setStatusMsg("Failed to start search."); setIsSearching(false); setLeadHistory((prev) => prev.map((h) => h.id === historyId ? { ...h, status: "failed" as const } : h)); return; }
      setLeadRunId(data.runId);
    } catch { setStatusMsg("Search failed."); setIsSearching(false); setLeadHistory((prev) => prev.map((h) => h.id === historyId ? { ...h, status: "failed" as const } : h)); }
  };
  const handleCancel = async () => { if (leadRunId) await cancelLeadSearch(leadRunId).catch(() => {}); esRef.current?.close(); setIsSearching(false); setLeadRunId(null); setLogs((prev) => [...prev, { type: "error", message: "Search cancelled.", timestamp: new Date().toISOString() }]); };

  const addLead = (lead: Lead) => { if (leads.some((l) => l.id === lead.id)) return; setLeads((prev) => [lead, ...prev]); setSearchResults((prev) => prev.filter((r) => r.id !== lead.id)); };
  const addAllResults = () => { setLeads((prev) => [...searchResults.filter((r) => !leads.some((l) => l.id === r.id)), ...prev]); setSearchResults([]); };
  const deleteLead = (id: string) => { setLeads((prev) => prev.filter((l) => l.id !== id)); setSelectedLeads((prev) => { const n = new Set(prev); n.delete(id); return n; }); };
  const toggleSelect = (id: string) => { setSelectedLeads((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const selectAll = () => { setSelectedLeads(selectedLeads.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))); };
  const setLeadEmail = (id: string, email: string) => { setLeads((prev) => prev.map((l) => l.id === id ? { ...l, email, possibleEmails: [] } : l)); setEditingEmailId(null); setEmailDraft(""); };
  const startEditEmail = (lead: Lead) => { setEditingEmailId(lead.id); setEmailDraft(lead.email || ""); };
  const toggleSuggestions = (id: string) => { setExpandedSuggestions((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const setSearchResultEmail = (id: string, email: string) => { setSearchResults((prev) => prev.map((l) => l.id === id ? { ...l, email, possibleEmails: [] } : l)); setEditingEmailId(null); setEmailDraft(""); };

  // ── Sender handlers ──
  const handleSaveSender = async () => {
    if (!senderForm.fromName || !senderForm.fromEmail) return;
    if (senderForm.useGmailSmtp && !senderForm.gmailAppPassword) { setStatusMsg("Gmail App Password is required when Gmail SMTP is enabled."); return; }
    const r = await saveSenderIdentity(senderForm.fromName, senderForm.fromEmail, senderForm.useGmailSmtp, senderForm.gmailAppPassword || undefined);
    if (r.success) { setSenders((prev) => [...prev, r.sender]); setSenderForm({ fromName: "", fromEmail: "", useGmailSmtp: false, gmailAppPassword: "" }); setShowSenderForm(false); }
    else setStatusMsg(r.error || "Failed to save sender.");
  };
  const handleDeleteSender = async (id: string) => { await deleteSenderApi(id); setSenders((prev) => prev.filter((s) => s.id !== id)); };

  // ── Campaign handlers ──
  const handleCreateCampaign = async () => {
    const targets = leads.filter((l) => selectedLeads.has(l.id) && l.email);
    if (!targets.length) { setStatusMsg("Select leads with email addresses first."); return; }
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.body || !campaignForm.senderId) { setStatusMsg("Fill all campaign fields and select a sender."); return; }
    const r = await createCampaignApi({ ...campaignForm, leads: targets });
    if (r.success) { setCampaigns((prev) => [r.campaign, ...prev]); setShowCampaignForm(false); setCampaignForm({ name: "", subject: "", body: "", senderId: "" }); setStatusMsg(`Campaign "${r.campaign.name}" created with ${targets.length} recipients.`); }
  };
  const handleSendCampaign = async (id: string) => {
    setSendingCampaignId(id);
    const result = await sendCampaignApi(id);
    if (result.success) { const r = await getCampaignsApi(); if (r.success) setCampaigns(r.campaigns); setStatusMsg("Campaign sent!"); }
    else setStatusMsg(result.error || "Failed to send.");
    setSendingCampaignId(null);
  };
  const handleViewCampaign = async (c: CampaignItem) => { setViewingCampaign(c); const r = await getCampaignLogsApi(c.id); if (r.success) setCampaignLogs(r.logs); };
  const handleDeleteCampaign = async (id: string) => { await deleteCampaignApi(id); setCampaigns((prev) => prev.filter((c) => c.id !== id)); if (viewingCampaign?.id === id) setViewingCampaign(null); };
  const refreshCampaigns = async () => { const r = await getCampaignsApi(); if (r.success) setCampaigns(r.campaigns); };

  const emailLeadCount = leads.filter((l) => selectedLeads.has(l.id) && l.email).length;

  const historyItems: HistoryPanelItem[] = leadHistory.map((h) => ({
    id: h.id,
    label: h.query,
    sublabel: h.status === "done" ? `${h.leadCount} leads found` : undefined,
    timestamp: h.timestamp,
    status: h.status,
  }));

  return (
    <HistoryPanel
      title="Search History"
      color="#f59e0b"
      icon={<Clock size={14} />}
      items={historyItems}
      onDelete={(id) => onDeleteHistory(id)}
    >
    <div className="min-h-screen p-6 space-y-5 page-enter max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff" }}><Users size={20} /></div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Lead Generation</h1>
          <p className="text-xs text-muted-foreground">Find contacts · Build lead lists · Create campaigns · Send outreach</p>
        </div>
        <Badge variant="secondary" className="text-xs px-3 py-1.5 rounded-full font-medium text-primary" style={{ backgroundColor: "var(--accent-soft)" }}>{leads.length} lead{leads.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted">
        <button onClick={() => setActiveTab("leads")} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all", activeTab !== "leads" && "text-muted-foreground")}
          style={{ background: activeTab === "leads" ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "transparent", ...(activeTab === "leads" ? { color: "#fff" } : {}) }}>
          <Users size={14} /> Leads & Search
        </button>
        <button onClick={() => setActiveTab("campaigns")} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all", activeTab !== "campaigns" && "text-muted-foreground")}
          style={{ background: activeTab === "campaigns" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent", ...(activeTab === "campaigns" ? { color: "#fff" } : {}) }}>
          <Megaphone size={14} /> Campaigns & Outreach
          {campaigns.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>{campaigns.length}</span>}
        </button>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium animate-fade-in text-primary" style={{ backgroundColor: "var(--accent-soft)", border: "1px solid var(--accent)" }}>
          <CheckCircle2 size={14} /> {statusMsg}
          <button onClick={() => setStatusMsg("")} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {activeTab === "leads" ? (
        <>
          {/* Search */}
          <ScrollReveal animation="scroll-fade-up">
          <div className="rounded-2xl p-5 bg-card border border-border shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}><Search size={13} /></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prospect Search</span>
            </div>
            <div className="flex gap-2">
              <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder='e.g. "VP of Engineering at fintech startups in SF"' className="flex-1 h-auto px-4 py-2.5 rounded-xl text-sm" />
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="h-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white shrink-0"
                style={{ background: isSearching ? "var(--bg-hover)" : "linear-gradient(135deg, #f59e0b, #ef4444)", boxShadow: "0 2px 8px rgba(245,158,11,0.3)" }}>
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} {isSearching ? "Searching..." : "Find Leads"}
              </Button>
              {isSearching && <Button onClick={handleCancel} variant="ghost" className="h-auto px-4 py-2.5 rounded-xl text-sm font-medium shrink-0" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1.5px solid rgba(239,68,68,0.3)" }}><XCircle size={14} /> Stop</Button>}
            </div>
          </div>
          </ScrollReveal>

          {(logs.length > 0 || isSearching) && <div className="animate-scale-in flex overflow-hidden" style={{ height: 300 }}><LiveLogs logs={logs} isRunning={isSearching} /></div>}
          {searchResults.length > 0 && <SearchResultsTable results={searchResults} onAdd={addLead} onAddAll={addAllResults} editingEmailId={editingEmailId} emailDraft={emailDraft} setEmailDraft={setEmailDraft} startEditEmail={startEditEmail} setSearchResultEmail={setSearchResultEmail} setEditingEmailId={setEditingEmailId} expandedSuggestions={expandedSuggestions} toggleSuggestions={toggleSuggestions} />}
          <MyLeadsTable leads={leads} selectedLeads={selectedLeads} toggleSelect={toggleSelect} selectAll={selectAll} deleteLead={deleteLead} editingEmailId={editingEmailId} emailDraft={emailDraft} setEmailDraft={setEmailDraft} startEditEmail={startEditEmail} setLeadEmail={setLeadEmail} setEditingEmailId={setEditingEmailId} expandedSuggestions={expandedSuggestions} toggleSuggestions={toggleSuggestions} isAdmin={isAdmin}
            onCreateCampaign={() => { if (selectedLeads.size === 0) { setStatusMsg("Select leads first."); return; } setActiveTab("campaigns"); setShowCampaignForm(true); }} />
        </>
      ) : (
        /* ── Campaigns Tab ── */
        <div className="space-y-5">
          {/* Sender Identity */}
          <ScrollReveal animation="scroll-fade-up">
          <div className="rounded-2xl p-5 bg-card border border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}><User size={14} /></span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sender Identity</span>
                  <p className="text-[10px] text-muted-foreground">Your name and email shown to recipients. Emails are sent directly from this machine — no SMTP server needed.</p>
                </div>
              </div>
              <button onClick={() => setShowSenderForm(!showSenderForm)} className="text-[10px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all hover:scale-105"
                style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                <Plus size={10} /> {showSenderForm ? "Cancel" : "Add Sender"}
              </button>
            </div>
            {senders.length > 0 && (
              <div className="space-y-2 mb-4">
                {senders.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl group bg-muted border border-border">
                    <Mail size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">{s.fromName}</div>
                      <div className="text-[10px] text-muted-foreground">{s.fromEmail}</div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: s.useGmailSmtp ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)", color: s.useGmailSmtp ? "#eab308" : "#22c55e" }}>{s.useGmailSmtp ? "Gmail SMTP" : "Direct"}</span>
                    <button onClick={() => handleDeleteSender(s.id)} className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ color: "#ef4444" }}><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            )}
            {showSenderForm && (
              <div className="rounded-xl p-4 space-y-3 animate-scale-in bg-muted border border-border">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Your Name</label>
                    <Input type="text" value={senderForm.fromName} onChange={(e) => setSenderForm({ ...senderForm, fromName: e.target.value })} placeholder="John Doe"
                      className="w-full px-3 py-2 rounded-lg text-xs h-auto bg-card" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Your Email</label>
                    <Input type="email" value={senderForm.fromEmail} onChange={(e) => setSenderForm({ ...senderForm, fromEmail: e.target.value })} placeholder="john@yourcompany.com"
                      className="w-full px-3 py-2 rounded-lg text-xs h-auto bg-card" />
                  </div>
                </div>

                {/* Gmail SMTP Toggle */}
                <div className="rounded-lg p-3 bg-card border border-border">
                  <div className="flex items-center justify-between cursor-pointer"
                    onClick={() => setSenderForm({ ...senderForm, useGmailSmtp: !senderForm.useGmailSmtp })}>
                    <div className="flex items-center gap-2">
                      <Mail size={14} style={{ color: senderForm.useGmailSmtp ? "#eab308" : undefined }} className={cn(!senderForm.useGmailSmtp && "text-muted-foreground")} />
                      <div>
                        <div className="text-xs font-semibold text-foreground">Gmail SMTP Server</div>
                        <div className="text-[10px] text-muted-foreground">Use smtp.gmail.com for reliable delivery. Requires an App Password.</div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3 w-10 h-5 rounded-full transition-all duration-200" style={{ backgroundColor: senderForm.useGmailSmtp ? "#eab308" : "var(--border)" }}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200" style={{ transform: senderForm.useGmailSmtp ? "translateX(22px) translateY(2px)" : "translateX(2px) translateY(2px)" }} />
                    </div>
                  </div>

                  {senderForm.useGmailSmtp && (
                    <div className="mt-3 space-y-2 animate-fade-in">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Gmail App Password</label>
                        <Input type="password" value={senderForm.gmailAppPassword} onChange={(e) => setSenderForm({ ...senderForm, gmailAppPassword: e.target.value })} placeholder="xxxx xxxx xxxx xxxx"
                          className="w-full px-3 py-2 rounded-lg text-xs h-auto bg-muted" />
                      </div>
                      <div className="text-[10px] px-2 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(234,179,8,0.08)", color: "#eab308" }}>
                        Go to myaccount.google.com → Security → 2-Step Verification → App Passwords to generate one.
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveSender} disabled={!senderForm.fromName || !senderForm.fromEmail || (senderForm.useGmailSmtp && !senderForm.gmailAppPassword)}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white h-auto"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  <Check size={12} /> Save Sender
                </Button>
              </div>
            )}
            {senders.length === 0 && !showSenderForm && (
              <div className="text-center py-6 text-muted-foreground">
                <Mail size={28} style={{ opacity: 0.15, margin: "0 auto 8px" }} />
                <p className="text-xs">Add a sender identity to start sending campaigns.</p>
                <p className="text-[10px] mt-1">Emails are delivered directly via MX resolution — no external mail server required.</p>
              </div>
            )}
          </div>
          </ScrollReveal>

          {/* Create Campaign */}
          <ScrollReveal animation="scroll-fade-up" delay={100}>
          <div className="rounded-2xl p-5 bg-card border border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}><Megaphone size={14} /></span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create Campaign</span>
                  <p className="text-[10px] text-muted-foreground">Compose personalized emails and send to selected leads</p>
                </div>
              </div>
              <button onClick={() => setShowCampaignForm(!showCampaignForm)} className="text-[10px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all hover:scale-105"
                style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                <Plus size={10} /> {showCampaignForm ? "Cancel" : "New Campaign"}
              </button>
            </div>
            {showCampaignForm && (
              <div className="space-y-3 animate-scale-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Campaign Name</label>
                    <Input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Q2 Outreach - Fintech VPs"
                      className="w-full px-3 py-2 rounded-xl text-sm h-auto bg-muted" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Send As</label>
                    <select value={campaignForm.senderId} onChange={(e) => setCampaignForm({ ...campaignForm, senderId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-muted border border-border text-foreground">
                      <option value="">Select sender...</option>
                      {senders.map((s) => <option key={s.id} value={s.id}>{s.fromName} ({s.fromEmail})</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Subject Line</label>
                  <Input type="text" value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} placeholder="Quick question about {{company}}"
                    className="w-full px-3 py-2 rounded-xl text-sm h-auto bg-muted" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block text-muted-foreground">Email Body</label>
                  <textarea value={campaignForm.body} onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                    placeholder={"Hi {{first_name}},\n\nI noticed {{company}} is expanding their engineering team...\n\nWould love to connect.\n\nBest,\nYour Name"}
                    rows={8} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none bg-muted border border-border text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow]" />
                </div>
                <div className="flex items-center gap-2 text-[10px] flex-wrap text-muted-foreground">
                  <span>Variables: </span>
                  {["{{name}}", "{{first_name}}", "{{company}}", "{{role}}", "{{email}}"].map((v) => (
                    <span key={v} className="px-1.5 py-0.5 rounded cursor-pointer hover:scale-105 transition-all bg-muted text-primary"
                      onClick={() => setCampaignForm({ ...campaignForm, body: campaignForm.body + v })}>{v}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 text-xs text-muted-foreground">
                    {selectedLeads.size > 0 ? <span>{emailLeadCount} of {selectedLeads.size} selected leads have emails</span> : <span style={{ color: "#f59e0b" }}>Go to Leads tab and select leads first</span>}
                  </div>
                  <Button onClick={handleCreateCampaign} disabled={!campaignForm.name || !campaignForm.subject || !campaignForm.body || !campaignForm.senderId || emailLeadCount === 0}
                    className="h-auto px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", boxShadow: "0 2px 8px rgba(139,92,246,0.3)" }}>
                    <Megaphone size={14} /> Create Campaign
                  </Button>
                </div>
              </div>
            )}
            {!showCampaignForm && senders.length > 0 && <div className="text-center py-4 text-muted-foreground"><p className="text-xs">Select leads from the Leads tab, then create a campaign here.</p></div>}
          </div>
          </ScrollReveal>

          {/* Campaign List */}
          {campaigns.length > 0 && (
            <ScrollReveal animation="scroll-fade-up" delay={200}>
            <div className="rounded-2xl p-5 bg-card border border-border shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}><Mail size={14} /></span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaigns ({campaigns.length})</span>
                </div>
                <button onClick={refreshCampaigns} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 bg-muted text-muted-foreground border border-border"><RefreshCw size={12} /></button>
              </div>
              <div className="space-y-3">
                {campaigns.map((c) => {
                  const sc = c.status === "sent" ? "#22c55e" : c.status === "sending" ? "#eab308" : c.status === "failed" ? "#ef4444" : "var(--text-muted)";
                  return (
                    <div key={c.id} className="rounded-xl p-4 group transition-all bg-muted border border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{c.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ backgroundColor: `${sc}15`, color: sc }}>{c.status}</span>
                          </div>
                          <div className="text-[10px] mt-1 flex items-center gap-3 text-muted-foreground">
                            <span>Subject: {c.subject}</span><span>·</span><span>{c.stats.total} recipients</span>
                            {c.stats.sent > 0 && <><span>·</span><span style={{ color: "#22c55e" }}>{c.stats.sent} sent</span></>}
                            {c.stats.failed > 0 && <><span>·</span><span style={{ color: "#ef4444" }}>{c.stats.failed} failed</span></>}
                            <span>·</span><span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.status === "draft" && (
                            <button onClick={() => handleSendCampaign(c.id)} disabled={sendingCampaignId === c.id}
                              className="text-[10px] px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1 transition-all hover:scale-105"
                              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 6px rgba(34,197,94,0.3)" }}>
                              {sendingCampaignId === c.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                              {sendingCampaignId === c.id ? "Sending..." : "Send Now"}
                            </button>
                          )}
                          <button onClick={() => handleViewCampaign(c)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 bg-card text-muted-foreground border border-border"><Eye size={12} /></button>
                          <button onClick={() => handleDeleteCampaign(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110" style={{ color: "#ef4444" }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </ScrollReveal>
          )}

          {/* Campaign Detail */}
          {viewingCampaign && (
            <div className="rounded-2xl p-5 animate-scale-in bg-card border border-border" style={{ borderColor: "var(--accent)", boxShadow: "0 4px 24px rgba(99,102,241,0.15)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-primary" style={{ backgroundColor: "rgba(99,102,241,0.15)" }}><Eye size={14} /></span>
                  <span className="text-sm font-semibold text-foreground">{viewingCampaign.name}</span>
                </div>
                <button onClick={() => setViewingCampaign(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl p-3 text-center bg-muted"><div className="text-lg font-bold text-foreground">{viewingCampaign.stats.total}</div><div className="text-[10px] text-muted-foreground">Total</div></div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(34,197,94,0.08)" }}><div className="text-lg font-bold" style={{ color: "#22c55e" }}>{viewingCampaign.stats.sent}</div><div className="text-[10px] text-muted-foreground">Sent</div></div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}><div className="text-lg font-bold" style={{ color: "#ef4444" }}>{viewingCampaign.stats.failed}</div><div className="text-[10px] text-muted-foreground">Failed</div></div>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Recipients</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
                {viewingCampaign.recipients.map((r: any) => (
                  <div key={r.leadId} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-muted">
                    <span className={cn("w-2 h-2 rounded-full")} style={{ backgroundColor: r.status === "sent" ? "#22c55e" : r.status === "failed" ? "#ef4444" : undefined }} />
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span style={{ color: "#3b82f6" }}>{r.email}</span>
                    <span className={cn("ml-auto text-[9px] capitalize", r.status !== "sent" && r.status !== "failed" && "text-muted-foreground")} style={r.status === "sent" ? { color: "#22c55e" } : r.status === "failed" ? { color: "#ef4444" } : undefined}>{r.status}</span>
                    {r.error && <span className="text-[9px]" style={{ color: "#ef4444" }} title={r.error}>⚠</span>}
                  </div>
                ))}
              </div>
              {campaignLogs.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Send Log</div>
                  <div className="rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 bg-muted font-mono">
                    {campaignLogs.map((log: string, i: number) => (
                      <div key={i} className={cn("text-[10px]", !log.includes("✓") && !log.includes("✗") && "text-muted-foreground")} style={log.includes("✓") ? { color: "#22c55e" } : log.includes("✗") ? { color: "#ef4444" } : undefined}>{log}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </HistoryPanel>
  );
}


/* ── Search Results Table ── */
function SearchResultsTable({ results, onAdd, onAddAll, editingEmailId, emailDraft, setEmailDraft, startEditEmail, setSearchResultEmail, setEditingEmailId, expandedSuggestions, toggleSuggestions }: any) {
  return (
    <div className="rounded-2xl overflow-hidden animate-scale-in bg-card border border-border shadow-md">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}><UserPlus size={13} /></span><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Results ({results.length})</span></div>
        <Button onClick={onAddAll} variant="ghost" className="text-xs px-3 py-1.5 rounded-lg font-medium h-auto" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}><Plus size={12} /> Add All</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead><tr className="bg-muted">{["Name","Company","Role","Email","LinkedIn",""].map((h) => <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2 text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>{results.map((lead: any) => (
            <tr key={lead.id} className="transition-all duration-150 border-t border-border hover:bg-muted/50">
              <td className="px-3 py-2.5 font-medium text-foreground">{lead.name}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{lead.company}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{lead.role}</td>
              <td className="px-3 py-2.5"><EmailCell lead={lead} editing={editingEmailId === lead.id} emailDraft={emailDraft} setEmailDraft={setEmailDraft} startEdit={startEditEmail} setEmail={(e: string) => setSearchResultEmail(lead.id, e)} cancelEdit={() => { setEditingEmailId(null); setEmailDraft(""); }} expanded={expandedSuggestions.has(lead.id)} toggleSuggestions={() => toggleSuggestions(lead.id)} /></td>
              <td className="px-3 py-2.5">{lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}><ExternalLink size={13} /></a> : <span className="text-muted-foreground">—</span>}</td>
              <td className="px-3 py-2.5"><button onClick={() => onAdd(lead)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-all" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}><Plus size={14} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── My Leads Table ── */
function MyLeadsTable({ leads, selectedLeads, toggleSelect, selectAll, deleteLead, editingEmailId, emailDraft, setEmailDraft, startEditEmail, setLeadEmail, setEditingEmailId, expandedSuggestions, toggleSuggestions, onCreateCampaign, isAdmin }: any) {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-md">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}><Table2 size={13} /></span><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Leads ({leads.length})</span></div>
        <div className="flex items-center gap-2">
          {leads.length > 0 && <button onClick={selectAll} className="text-[10px] px-2.5 py-1 rounded-lg font-medium bg-muted text-muted-foreground border border-border">{selectedLeads.size === leads.length ? "Deselect All" : "Select All"}</button>}
          {selectedLeads.size > 0 && <button onClick={onCreateCampaign} className="text-[10px] px-3 py-1 rounded-lg font-medium flex items-center gap-1" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", boxShadow: "0 2px 6px rgba(139,92,246,0.3)" }}><Megaphone size={10} /> Create Campaign ({selectedLeads.size})</button>}
        </div>
      </div>
      {leads.length === 0 ? (
        <div className="text-center py-12 px-5 text-muted-foreground"><UserPlus size={32} style={{ opacity: 0.2, margin: "0 auto 12px" }} /><p className="text-sm">No leads yet</p><p className="text-xs mt-1">Search for prospects above to build your list</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead><tr className="bg-muted">
              <th className="px-5 py-2 w-8"><div className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer" style={{ borderColor: selectedLeads.size === leads.length ? "var(--accent)" : "var(--border)", backgroundColor: selectedLeads.size === leads.length ? "var(--accent)" : "transparent" }} onClick={selectAll}>{selectedLeads.size === leads.length && <span className="text-white text-[8px] font-bold">✓</span>}</div></th>
              {["Name","Company","Role","Email","LinkedIn","Added",""].map((h) => <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2 text-muted-foreground">{h}</th>)}
            </tr></thead>
            <tbody>{leads.map((lead: any) => {
              const selected = selectedLeads.has(lead.id);
              return (
                <tr key={lead.id} className={cn("cursor-pointer transition-all duration-150", selected ? "" : "hover:bg-muted/50")} onClick={() => toggleSelect(lead.id)} style={selected ? { backgroundColor: "var(--accent-soft)" } : undefined}>
                  <td className="px-5 py-2.5"><div className="w-4 h-4 rounded border-2 flex items-center justify-center" style={{ borderColor: selected ? "var(--accent)" : "var(--border)", backgroundColor: selected ? "var(--accent)" : "transparent" }}>{selected && <span className="text-white text-[8px] font-bold">✓</span>}</div></td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{lead.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{lead.company}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{lead.role || "—"}</td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><EmailCell lead={lead} editing={editingEmailId === lead.id} emailDraft={emailDraft} setEmailDraft={setEmailDraft} startEdit={startEditEmail} setEmail={(e: string) => setLeadEmail(lead.id, e)} cancelEdit={() => { setEditingEmailId(null); setEmailDraft(""); }} expanded={expandedSuggestions.has(lead.id)} toggleSuggestions={() => toggleSuggestions(lead.id)} /></td>
                  <td className="px-3 py-2.5">{lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#3b82f6" }}><ExternalLink size={13} /></a> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{new Date(lead.addedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">{isAdmin && <button onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }} className="w-6 h-6 rounded flex items-center justify-center hover:scale-110 transition-all" style={{ color: "#ef4444" }}><Trash2 size={12} /></button>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Email Cell ── */
function EmailCell({ lead, editing, emailDraft, setEmailDraft, startEdit, setEmail, cancelEdit, expanded, toggleSuggestions }: any) {
  if (lead.email) return <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{lead.email}</span>;
  if (editing) return (
    <div className="flex items-center gap-1">
      <Input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && emailDraft.trim()) setEmail(emailDraft.trim()); if (e.key === "Escape") cancelEdit(); }}
        className="px-2 py-1 rounded-lg text-xs w-40 h-auto" autoFocus placeholder="email@company.com" />
      <button onClick={() => { if (emailDraft.trim()) setEmail(emailDraft.trim()); }} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "#22c55e" }}><Check size={12} /></button>
    </div>
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); startEdit(lead); }} className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 hover:scale-105 transition-all" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}><Edit3 size={9} /> Add Email</button>
        {lead.possibleEmails?.length > 0 && <button onClick={(e) => { e.stopPropagation(); toggleSuggestions(); }} className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 hover:scale-105 transition-all" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>{expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />} {lead.possibleEmails.length} suggested</button>}
      </div>
      {expanded && lead.possibleEmails?.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-0.5">{lead.possibleEmails.map((pe: string) => (
          <button key={pe} onClick={(e) => { e.stopPropagation(); setEmail(pe); }} className="text-[10px] px-2 py-0.5 rounded text-left hover:scale-[1.02] transition-all truncate max-w-[200px]" style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6" }} title={`Use ${pe}`}>{pe}</button>
        ))}</div>
      )}
    </div>
  );
}

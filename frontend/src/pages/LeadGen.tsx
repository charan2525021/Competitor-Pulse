import { useState, useEffect, useRef } from "react";
import {
  Users, Search, Trash2, Mail, Send, Plus, Loader2,
  UserPlus, XCircle, ExternalLink, Table2, Edit3, Check, ChevronDown, ChevronUp,
  Clock,
} from "lucide-react";
import { LiveLogs } from "../components/LiveLogs";
import { startLeadSearch, createLeadLogStream, fetchLeadResults, cancelLeadSearch } from "../services/api";
import type { LogEntry } from "../hooks/useAgentLogs";
import { ScrollReveal } from "../components/ScrollReveal";

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  possibleEmails?: string[];
  linkedinUrl?: string;
  addedAt: string;
}

export interface LeadSearchHistory {
  id: string;
  query: string;
  timestamp: string;
  leadCount: number;
  status: "running" | "done" | "failed";
}

interface LeadGenProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  leadHistory: LeadSearchHistory[];
  setLeadHistory: React.Dispatch<React.SetStateAction<LeadSearchHistory[]>>;
  onDeleteHistory: (id: string) => void;
  leadRunId: string | null;
  setLeadRunId: (id: string | null) => void;
  onLeadsReady: (leads: Lead[], query: string) => void;
  isAdmin?: boolean;
}

export function LeadGen({ leads, setLeads, leadHistory, setLeadHistory, onDeleteHistory, leadRunId, setLeadRunId, onLeadsReady, isAdmin }: LeadGenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  // Reconnect to SSE if we have an active leadRunId (e.g. after tab switch)
  useEffect(() => {
    if (!leadRunId) return;

    // Try to reconnect — the backend keeps the run alive
    setIsSearching(true);
    setLogs([]);

    const es = createLeadLogStream(
      leadRunId,
      (msg) => { setLogs((prev) => [...prev, { ...msg, timestamp: new Date().toISOString() }]); },
      async (incomingLeads) => {
        setIsSearching(false);
        let finalLeads: Lead[] = [];
        if (incomingLeads && incomingLeads.length > 0) {
          finalLeads = incomingLeads;
        } else {
          try {
            const res = await fetchLeadResults(leadRunId);
            if (res.success && res.leads?.length > 0) finalLeads = res.leads;
          } catch { /* no results */ }
        }

        if (finalLeads.length > 0) {
          setSearchResults(finalLeads);
          setStatusMsg(`Found ${finalLeads.length} lead${finalLeads.length !== 1 ? "s" : ""}`);
          setLeads((prev) => {
            const existing = new Set(prev.map((l) => `${l.name}|${l.company}`.toLowerCase()));
            const newOnes = finalLeads.filter((l) => !existing.has(`${l.name}|${l.company}`.toLowerCase()));
            return [...newOnes, ...prev];
          });
          setLeadHistory((prev) => prev.map((h) => h.id === leadRunId || h.status === "running" ? { ...h, leadCount: finalLeads.length, status: "done" as const } : h));
          // Find the query from history for intel labeling
          const matchingHistory = leadHistory.find((h) => h.status === "running");
          onLeadsReady(finalLeads, matchingHistory?.query || "Lead Search");
        } else {
          setStatusMsg("No leads found. Try a different search query.");
          setLeadHistory((prev) => prev.map((h) => h.status === "running" ? { ...h, status: "done" as const } : h));
        }
        setLeadRunId(null);
      }
    );
    esRef.current = es;

    return () => { /* don't close — process continues across tab switches */ };
  }, [leadRunId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setStatusMsg("");
    setLogs([]);

    const historyId = crypto.randomUUID();
    setLeadHistory((prev) => [
      { id: historyId, query: searchQuery, timestamp: new Date().toISOString(), leadCount: 0, status: "running" as const },
      ...prev,
    ]);

    try {
      const data = await startLeadSearch(searchQuery);
      if (!data.success || !data.runId) {
        setStatusMsg("Failed to start search.");
        setIsSearching(false);
        setLeadHistory((prev) => prev.map((h) => h.id === historyId ? { ...h, status: "failed" as const } : h));
        return;
      }
      // Setting leadRunId triggers the reconnect useEffect which handles SSE
      setLeadRunId(data.runId);
    } catch {
      setStatusMsg("Search failed. Make sure the backend is running.");
      setIsSearching(false);
      setLeadHistory((prev) => prev.map((h) => h.id === historyId ? { ...h, status: "failed" as const } : h));
    }
  };

  const handleCancel = async () => {
    if (leadRunId) await cancelLeadSearch(leadRunId).catch(() => {});
    esRef.current?.close();
    setIsSearching(false);
    setLeadRunId(null);
    setLogs((prev) => [...prev, { type: "error", message: "Search cancelled.", timestamp: new Date().toISOString() }]);
  };

  const addLead = (lead: Lead) => {
    if (leads.some((l) => l.id === lead.id)) return;
    setLeads((prev) => [lead, ...prev]);
    setSearchResults((prev) => prev.filter((r) => r.id !== lead.id));
  };
  const addAllResults = () => {
    const newLeads = searchResults.filter((r) => !leads.some((l) => l.id === r.id));
    setLeads((prev) => [...newLeads, ...prev]);
    setSearchResults([]);
  };
  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedLeads((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };
  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const selectAll = () => {
    setSelectedLeads(selectedLeads.size === leads.length ? new Set() : new Set(leads.map((l) => l.id)));
  };

  const setLeadEmail = (id: string, email: string) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, email, possibleEmails: [] } : l));
    setEditingEmailId(null);
    setEmailDraft("");
  };

  const startEditEmail = (lead: Lead) => {
    setEditingEmailId(lead.id);
    setEmailDraft(lead.email || "");
  };

  const toggleSuggestions = (id: string) => {
    setExpandedSuggestions((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // Same functions for search results
  const setSearchResultEmail = (id: string, email: string) => {
    setSearchResults((prev) => prev.map((l) => l.id === id ? { ...l, email, possibleEmails: [] } : l));
    setEditingEmailId(null);
    setEmailDraft("");
  };
  const handleSendOutreach = async () => {
    if (selectedLeads.size === 0 || !outreachSubject.trim() || !outreachBody.trim()) return;
    setSendingEmail(true);
    try {
      const targets = leads.filter((l) => selectedLeads.has(l.id));
      const res = await fetch("/api/leads/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: targets, subject: outreachSubject, body: outreachBody }),
      });
      const data = await res.json();
      setStatusMsg(data.message || `Outreach sent to ${targets.length} leads`);
    } catch { setStatusMsg("Failed to send outreach."); }
    setSendingEmail(false);
  };

  return (
    <div className="min-h-screen p-6 space-y-5 page-enter" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff" }}>
          <Users size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Lead Generation</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Find contacts via LinkedIn · Build lead lists · Send cold outreach</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search History */}
      {leadHistory.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}><Clock size={13} /></span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Search History</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {leadHistory.map((h) => {
              const dotColor = h.status === "running" ? "#eab308" : h.status === "done" ? "#22c55e" : "#ef4444";
              return (
                <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 group"
                  style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${h.status === "running" ? "animate-pulse-dot" : ""}`}
                    style={{ backgroundColor: dotColor }} />
                  <span className="font-medium truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}
                    title={h.query}>{h.query}</span>
                  {h.status === "done" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                      {h.leadCount}
                    </span>
                  )}
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {new Date(h.timestamp).toLocaleDateString()}
                  </span>
                  {isAdmin && (
                    <button onClick={() => onDeleteHistory(h.id)}
                      className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      style={{ color: "#ef4444" }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <ScrollReveal animation="scroll-fade-up">
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}><Search size={13} /></span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Prospect Search</span>
        </div>
        <div className="flex gap-2">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder='e.g. "VP of Engineering at fintech startups in SF"'
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
            style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 flex items-center gap-2 shrink-0"
            style={{ background: isSearching ? "var(--bg-hover)" : "linear-gradient(135deg, #f59e0b, #ef4444)", opacity: !searchQuery.trim() ? 0.5 : 1, boxShadow: "0 2px 8px rgba(245,158,11,0.3)" }}>
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {isSearching ? "Searching..." : "Find Leads"}
          </button>
          {isSearching && (
            <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1.5px solid rgba(239,68,68,0.3)" }}>
              <XCircle size={14} /> Stop
            </button>
          )}
        </div>
        {statusMsg && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{statusMsg}</p>}
      </div>
      </ScrollReveal>

      {/* Live Logs */}
      {(logs.length > 0 || isSearching) && (
        <div className="animate-scale-in flex overflow-hidden" style={{ height: 300, minHeight: 300, maxHeight: 300 }}>
          <LiveLogs logs={logs} isRunning={isSearching} />
        </div>
      )}

      {/* Search Results Table */}
      {searchResults.length > 0 && (
        <div className="rounded-2xl overflow-hidden animate-scale-in"
          style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}><UserPlus size={13} /></span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Search Results ({searchResults.length})</span>
            </div>
            <button onClick={addAllResults} className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
              <Plus size={12} /> Add All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-input)" }}>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-5 py-2" style={{ color: "var(--text-muted)" }}>Name</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Company</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Role</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Email</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>LinkedIn</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((lead) => (
                  <tr key={lead.id} className="transition-all duration-150"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{lead.name}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>{lead.company}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>{lead.role}</td>
                    <td className="px-3 py-2.5">
                      {lead.email ? (
                        <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{lead.email}</span>
                      ) : editingEmailId === lead.id ? (
                        <div className="flex items-center gap-1">
                          <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && emailDraft.trim()) setSearchResultEmail(lead.id, emailDraft.trim()); if (e.key === "Escape") { setEditingEmailId(null); setEmailDraft(""); } }}
                            className="px-2 py-1 rounded-lg text-xs outline-none w-40"
                            style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--accent)", color: "var(--text-primary)" }}
                            autoFocus placeholder="email@company.com" />
                          <button onClick={() => { if (emailDraft.trim()) setSearchResultEmail(lead.id, emailDraft.trim()); }}
                            className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "#22c55e" }}><Check size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); startEditEmail(lead); }}
                              className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 hover:scale-105 transition-all"
                              style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                              <Edit3 size={9} /> Add Email
                            </button>
                            {lead.possibleEmails && lead.possibleEmails.length > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); toggleSuggestions(lead.id); }}
                                className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 hover:scale-105 transition-all"
                                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                                {expandedSuggestions.has(lead.id) ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                {lead.possibleEmails.length} suggested
                              </button>
                            )}
                          </div>
                          {expandedSuggestions.has(lead.id) && lead.possibleEmails && lead.possibleEmails.length > 0 && (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              {lead.possibleEmails.map((pe) => (
                                <button key={pe} onClick={(e) => { e.stopPropagation(); setSearchResultEmail(lead.id, pe); }}
                                  className="text-[10px] px-2 py-0.5 rounded text-left hover:scale-[1.02] transition-all truncate max-w-[200px]"
                                  style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6" }}
                                  title={`Use ${pe}`}>
                                  {pe}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}><ExternalLink size={13} /></a> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => addLead(lead)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-all"
                        style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}><Plus size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* My Leads Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}><Table2 size={13} /></span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>My Leads ({leads.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {leads.length > 0 && (
              <button onClick={selectAll} className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
              </button>
            )}
            {selectedLeads.size > 0 && (
              <button onClick={() => {}} className="text-[10px] px-3 py-1 rounded-lg font-medium flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", boxShadow: "0 2px 6px rgba(139,92,246,0.3)" }}>
                <Mail size={10} /> Outreach ({selectedLeads.size})
              </button>
            )}
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="text-center py-12 px-5" style={{ color: "var(--text-muted)" }}>
            <UserPlus size={32} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
            <p className="text-sm">No leads yet</p>
            <p className="text-xs mt-1">Search for prospects above to build your list</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-input)" }}>
                  <th className="px-5 py-2 w-8"><div className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer"
                    style={{ borderColor: selectedLeads.size === leads.length ? "var(--accent)" : "var(--border)", backgroundColor: selectedLeads.size === leads.length ? "var(--accent)" : "transparent" }}
                    onClick={selectAll}>{selectedLeads.size === leads.length && <span className="text-white text-[8px] font-bold">✓</span>}</div></th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Name</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Company</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Role</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Email</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>LinkedIn</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-muted)" }}>Added</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const selected = selectedLeads.has(lead.id);
                  return (
                    <tr key={lead.id} className="cursor-pointer transition-all duration-150"
                      onClick={() => toggleSelect(lead.id)}
                      style={{ backgroundColor: selected ? "var(--accent-soft)" : "transparent" }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "transparent"; }}>
                      <td className="px-5 py-2.5">
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                          style={{ borderColor: selected ? "var(--accent)" : "var(--border)", backgroundColor: selected ? "var(--accent)" : "transparent" }}>
                          {selected && <span className="text-white text-[8px] font-bold">✓</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{lead.name}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>{lead.company}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>{lead.role || "—"}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {lead.email ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{lead.email}</span>
                            <button onClick={() => startEditEmail(lead)}
                              className="w-4 h-4 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-all" style={{ color: "var(--text-muted)" }}>
                              <Edit3 size={9} />
                            </button>
                          </div>
                        ) : editingEmailId === lead.id ? (
                          <div className="flex items-center gap-1">
                            <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && emailDraft.trim()) setLeadEmail(lead.id, emailDraft.trim()); if (e.key === "Escape") { setEditingEmailId(null); setEmailDraft(""); } }}
                              className="px-2 py-1 rounded-lg text-xs outline-none w-40"
                              style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--accent)", color: "var(--text-primary)" }}
                              autoFocus placeholder="email@company.com" />
                            <button onClick={() => { if (emailDraft.trim()) setLeadEmail(lead.id, emailDraft.trim()); }}
                              className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "#22c55e" }}><Check size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditEmail(lead)}
                                className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 hover:scale-105 transition-all"
                                style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                                <Edit3 size={9} /> Add Email
                              </button>
                              {lead.possibleEmails && lead.possibleEmails.length > 0 && (
                                <button onClick={() => toggleSuggestions(lead.id)}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 hover:scale-105 transition-all"
                                  style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                                  {expandedSuggestions.has(lead.id) ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                  {lead.possibleEmails.length} suggested
                                </button>
                              )}
                            </div>
                            {expandedSuggestions.has(lead.id) && lead.possibleEmails && lead.possibleEmails.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {lead.possibleEmails.map((pe) => (
                                  <button key={pe} onClick={() => setLeadEmail(lead.id, pe)}
                                    className="text-[10px] px-2 py-0.5 rounded text-left hover:scale-[1.02] transition-all truncate max-w-[200px]"
                                    style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6" }}
                                    title={`Use ${pe}`}>
                                    {pe}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#3b82f6" }}><ExternalLink size={13} /></a> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{new Date(lead.addedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
                          className="w-6 h-6 rounded flex items-center justify-center hover:scale-110 transition-all" style={{ color: "#ef4444" }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Outreach Composer */}
      <div className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}><Mail size={13} /></span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cold Outreach</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Subject</label>
            <input type="text" value={outreachSubject} onChange={(e) => setOutreachSubject(e.target.value)}
              placeholder="Quick question about {{company}}"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Message</label>
            <textarea value={outreachBody} onChange={(e) => setOutreachBody(e.target.value)}
              placeholder={"Hi {{name}},\n\nI noticed {{company}} is hiring for...\n\nWould love to connect."}
              rows={6} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span>Variables: </span>
            {["{{name}}", "{{company}}", "{{role}}", "{{email}}"].map((v) => (
              <span key={v} className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-input)", color: "var(--accent)" }}>{v}</span>
            ))}
          </div>
          <button onClick={handleSendOutreach}
            disabled={sendingEmail || selectedLeads.size === 0 || !outreachSubject.trim() || !outreachBody.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: selectedLeads.size > 0 ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "var(--bg-hover)",
              opacity: selectedLeads.size === 0 || !outreachSubject.trim() || !outreachBody.trim() ? 0.5 : 1,
              boxShadow: selectedLeads.size > 0 ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
            }}>
            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sendingEmail ? "Sending..." : `Send to ${selectedLeads.size} Lead${selectedLeads.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

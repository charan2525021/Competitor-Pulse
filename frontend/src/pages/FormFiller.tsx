import { useState, useEffect, useRef } from "react";
import {
  FileText, Globe, Play, Trash2, Plus, Save, Loader2,
  XCircle, CheckCircle2, AlertCircle, Clock, User, Building2,
  Mail, Phone, Briefcase, Link2, MessageSquare, Settings2, Search, ChevronDown,
} from "lucide-react";
import { LiveLogs } from "../components/LiveLogs";
import { HistoryPanel } from "../components/HistoryPanel";
import type { HistoryPanelItem } from "../components/HistoryPanel";
import { startFormFill, createFormLogStream, cancelFormFill } from "../services/api";
import type { LogEntry } from "../hooks/useAgentLogs";
import { ScrollReveal } from "../components/ScrollReveal";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FormProfile {
  id: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  message: string;
}

export interface FormFillRecord {
  id: string;
  url: string;
  formType: string;
  profileName: string;
  status: "running" | "success" | "failed";
  timestamp: string;
  result?: any;
}

const FORM_TYPES = [
  { value: "demo-request", label: "Request Demo", icon: Play, color: "#8b5cf6", desc: "Book a product demo or walkthrough" },
  { value: "contact-us", label: "Contact Us", icon: MessageSquare, color: "#3b82f6", desc: "General inquiry or contact form" },
  { value: "newsletter", label: "Newsletter Signup", icon: Mail, color: "#22c55e", desc: "Subscribe to email updates" },
  { value: "partnership", label: "Partnership Inquiry", icon: Building2, color: "#f59e0b", desc: "Explore partnership opportunities" },
  { value: "pricing-inquiry", label: "Get Pricing", icon: FileText, color: "#06b6d4", desc: "Request pricing or a quote" },
  { value: "job-application", label: "Job Application", icon: Briefcase, color: "#ec4899", desc: "Apply for open positions" },
  { value: "free-trial", label: "Free Trial Signup", icon: CheckCircle2, color: "#10b981", desc: "Start a free trial or account" },
  { value: "custom", label: "Custom Form", icon: Settings2, color: "#6366f1", desc: "Any form with custom instructions" },
];

const DEFAULT_PROFILE: FormProfile = {
  id: "default",
  name: "Default Profile",
  fullName: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  website: "",
  message: "",
};

interface FormFillerProps {
  profiles: FormProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<FormProfile[]>>;
  fillHistory: FormFillRecord[];
  setFillHistory: React.Dispatch<React.SetStateAction<FormFillRecord[]>>;
  onFormFillDone: (record: FormFillRecord) => void;
  onDeleteFillHistory?: (id: string) => void;
  isAdmin?: boolean;
}

export function FormFiller({ profiles, setProfiles, fillHistory, setFillHistory, onFormFillDone, onDeleteFillHistory, isAdmin: _isAdmin }: FormFillerProps) {
  const [companyName, setCompanyName] = useState("");
  const [selectedType, setSelectedType] = useState("demo-request");
  const [activeProfileId, setActiveProfileId] = useState(profiles[0]?.id || "");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editingProfile, setEditingProfile] = useState<FormProfile | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [expandedFills, setExpandedFills] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const currentRunId = useRef<string | null>(null);

  useEffect(() => { return () => { /* don't close — process continues across tab switches */ }; }, []);
  useEffect(() => { if (profiles.length > 0 && !activeProfileId) setActiveProfileId(profiles[0].id); }, [profiles, activeProfileId]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const handleFill = async () => {
    if (!companyName.trim() || !activeProfile) return;
    setIsRunning(true);
    setLogs([]);

    const recordId = crypto.randomUUID();
    setFillHistory((prev) => [{
      id: recordId, url: companyName.trim(), formType: selectedType,
      profileName: activeProfile.name, status: "running", timestamp: new Date().toISOString(),
    }, ...prev]);

    try {
      const data = await startFormFill(companyName.trim(), selectedType, activeProfile, customInstructions || undefined);
      if (!data.success || !data.runId) {
        setIsRunning(false);
        setFillHistory((prev) => prev.map((h) => h.id === recordId ? { ...h, status: "failed" as const } : h));
        return;
      }
      currentRunId.current = data.runId;
      const es = createFormLogStream(
        data.runId,
        (msg) => { setLogs((prev) => [...prev, { ...msg, timestamp: new Date().toISOString() }]); },
        (result) => {
          setIsRunning(false);
          const success = result?.success || result?.formFound;
          const finalStatus = success ? "success" as const : "failed" as const;
          const resolvedUrl = result?.resolvedUrl || result?.url || companyName.trim();
          setFillHistory((prev) => prev.map((h) => h.id === recordId
            ? { ...h, status: finalStatus, result, url: resolvedUrl }
            : h));
          onFormFillDone({
            id: recordId, url: resolvedUrl, formType: selectedType,
            profileName: activeProfile.name, status: finalStatus,
            timestamp: new Date().toISOString(), result,
          });
        }
      );
      esRef.current = es;
    } catch {
      setIsRunning(false);
      setFillHistory((prev) => prev.map((h) => h.id === recordId ? { ...h, status: "failed" as const } : h));
    }
  };

  const handleCancel = async () => {
    if (currentRunId.current) await cancelFormFill(currentRunId.current).catch(() => {});
    esRef.current?.close();
    setIsRunning(false);
  };

  const saveProfile = (p: FormProfile) => {
    if (profiles.some((x) => x.id === p.id)) {
      setProfiles((prev) => prev.map((x) => x.id === p.id ? p : x));
    } else {
      setProfiles((prev) => [...prev, p]);
    }
    setActiveProfileId(p.id);
    setEditingProfile(null);
    setShowProfileEditor(false);
  };

  const deleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(profiles[0]?.id || "");
  };

  const selectedTypeInfo = FORM_TYPES.find((t) => t.value === selectedType) || FORM_TYPES[0];

  const historyItems: HistoryPanelItem[] = fillHistory.map((h) => {
    const typeInfo = FORM_TYPES.find((t) => t.value === h.formType);
    return {
      id: h.id,
      label: h.url,
      sublabel: `${h.profileName} · ${h.result?.fieldsFilledCount ? `${h.result.fieldsFilledCount} fields` : ""}`,
      timestamp: h.timestamp,
      status: h.status,
      badge: typeInfo ? { text: typeInfo.label, color: typeInfo.color } : undefined,
    };
  });

  return (
    <HistoryPanel
      title="Fill History"
      color="#6366f1"
      icon={<Clock size={14} />}
      items={historyItems}
      onSelect={(id) => {
        const h = fillHistory.find((x) => x.id === id);
        if (h) { setCompanyName(h.url); setSelectedType(h.formType); }
      }}
      onDelete={(id) => { setFillHistory((prev) => prev.filter((x) => x.id !== id)); onDeleteFillHistory?.(id); }}
    >
    <div className="min-h-screen p-6 space-y-5 page-enter mx-auto" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          <FileText size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Form Filler</h1>
          <p className="text-xs text-muted-foreground">Enter a company name, pick a form type, and the AI agent finds & fills the right form</p>
        </div>
      </div>

      {/* Form Type Selection */}
      <ScrollReveal animation="scroll-fade-up">
      <Card className="rounded-2xl border border-border shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#6366f1" }}><Settings2 size={13} /></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form Type</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FORM_TYPES.map((ft) => {
              const Icon = ft.icon;
              const active = selectedType === ft.value;
              return (
                <button key={ft.value} onClick={() => setSelectedType(ft.value)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    backgroundColor: active ? `${ft.color}15` : "var(--bg-input)",
                    border: `1.5px solid ${active ? ft.color : "var(--border)"}`,
                    boxShadow: active ? `0 2px 8px ${ft.color}30` : "none",
                  }}>
                  <Icon size={18} style={{ color: active ? ft.color : "var(--text-muted)" }} />
                  <span className={cn("text-[11px] font-medium", !active && "text-muted-foreground")} style={active ? { color: ft.color } : undefined}>{ft.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] mt-2 text-muted-foreground">{selectedTypeInfo.desc}</p>
        </CardContent>
      </Card>
      </ScrollReveal>

      {/* Company Name + Profile + Go */}
      <Card className="rounded-2xl border border-border shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}><Building2 size={13} /></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Company</span>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Salesforce, HubSpot, Stripe, Notion..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground focus:border-primary"
                onKeyDown={(e) => { if (e.key === "Enter" && !isRunning && companyName.trim() && activeProfile?.fullName) handleFill(); }}
              />
            </div>
            <p className="text-[10px] flex items-center gap-1 text-muted-foreground">
              <Globe size={9} /> AI will automatically find the correct {selectedTypeInfo.label.toLowerCase()} page for this company
            </p>

            {/* Profile selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 text-muted-foreground">Profile:</span>
              <div className="flex items-center gap-1 flex-wrap flex-1">
                {profiles.map((p) => (
                  <button key={p.id} onClick={() => setActiveProfileId(p.id)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all duration-200 flex items-center gap-1",
                      activeProfileId === p.id
                        ? "bg-primary/10 text-primary border border-primary"
                        : "bg-muted text-muted-foreground border border-border"
                    )}>
                    <User size={10} /> {p.name}
                  </button>
                ))}
                <button onClick={() => { setEditingProfile({ ...DEFAULT_PROFILE, id: crypto.randomUUID(), name: `Profile ${profiles.length + 1}` }); setShowProfileEditor(true); }}
                  className="text-[11px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-all hover:scale-105"
                  style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <Plus size={10} /> New
                </button>
              </div>
              {activeProfile && (
                <button onClick={() => { setEditingProfile({ ...activeProfile }); setShowProfileEditor(true); }}
                  className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 transition-all hover:scale-105 bg-muted text-muted-foreground border border-border">
                  Edit
                </button>
              )}
            </div>

            {/* Active profile preview */}
            {activeProfile && activeProfile.fullName && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] px-3 py-2 rounded-lg bg-muted text-muted-foreground">
                {activeProfile.fullName && <span className="flex items-center gap-1"><User size={9} /> {activeProfile.fullName}</span>}
                {activeProfile.email && <span className="flex items-center gap-1"><Mail size={9} /> {activeProfile.email}</span>}
                {activeProfile.company && <span className="flex items-center gap-1"><Building2 size={9} /> {activeProfile.company}</span>}
                {activeProfile.phone && <span className="flex items-center gap-1"><Phone size={9} /> {activeProfile.phone}</span>}
                {activeProfile.jobTitle && <span className="flex items-center gap-1"><Briefcase size={9} /> {activeProfile.jobTitle}</span>}
                {activeProfile.website && <span className="flex items-center gap-1"><Link2 size={9} /> {activeProfile.website}</span>}
              </div>
            )}

            {/* Custom instructions */}
            {(selectedType === "custom" || customInstructions) && (
              <textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Additional instructions for the agent (e.g., 'Select Enterprise plan', 'Choose US region')"
                rows={3} className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none bg-muted border border-border text-foreground focus:border-primary"
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
            )}
            {selectedType !== "custom" && !customInstructions && (
              <button onClick={() => setCustomInstructions(" ")}
                className="text-[10px] flex items-center gap-1 transition-all hover:scale-105 text-muted-foreground">
                <Plus size={9} /> Add custom instructions
              </button>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button onClick={handleFill} disabled={isRunning || !companyName.trim() || !activeProfile?.fullName}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-200",
                  (!companyName.trim() || !activeProfile?.fullName) && "opacity-50"
                )}
                style={{
                  background: isRunning ? "var(--bg-hover)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                }}>
                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {isRunning ? "Finding & Filling Form..." : "Find & Fill Form"}
              </Button>
              {isRunning && (
                <Button variant="outline" onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1.5px solid rgba(239,68,68,0.3)" }}>
                  <XCircle size={14} /> Stop
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Editor Modal */}
      {showProfileEditor && editingProfile && (
        <Card className="rounded-2xl border-primary shadow-md animate-scale-in" style={{ boxShadow: "0 4px 24px rgba(99,102,241,0.15)" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}><User size={13} /></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {profiles.some((p) => p.id === editingProfile.id) ? "Edit Profile" : "New Profile"}
                </span>
              </div>
              <button onClick={() => { setShowProfileEditor(false); setEditingProfile(null); }}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground">
                <XCircle size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "name", label: "Profile Name", placeholder: "My Work Profile", icon: Settings2 },
                { key: "fullName", label: "Full Name", placeholder: "John Doe", icon: User },
                { key: "email", label: "Email", placeholder: "john@company.com", icon: Mail },
                { key: "phone", label: "Phone", placeholder: "+1 555-0123", icon: Phone },
                { key: "company", label: "Company", placeholder: "Acme Corp", icon: Building2 },
                { key: "jobTitle", label: "Job Title", placeholder: "VP of Engineering", icon: Briefcase },
                { key: "website", label: "Website", placeholder: "https://acme.com", icon: Link2 },
              ] as const).map(({ key, label, placeholder, icon: Icon }) => (
                <div key={key} className={key === "name" ? "col-span-2" : ""}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 text-muted-foreground">
                    <Icon size={9} /> {label}
                  </label>
                  <Input type="text" value={(editingProfile as any)[key]}
                    onChange={(e) => setEditingProfile({ ...editingProfile, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-muted border border-border text-foreground focus:border-primary" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 text-muted-foreground">
                  <MessageSquare size={9} /> Default Message
                </label>
                <textarea value={editingProfile.message}
                  onChange={(e) => setEditingProfile({ ...editingProfile, message: e.target.value })}
                  placeholder="I'm interested in learning more about your product..."
                  rows={3} className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none bg-muted border border-border text-foreground focus:border-primary"
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={() => saveProfile(editingProfile)}
                disabled={!editingProfile.name.trim() || !editingProfile.fullName.trim()}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-all",
                  (!editingProfile.name.trim() || !editingProfile.fullName.trim()) && "opacity-50"
                )}
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                <Save size={12} /> Save Profile
              </Button>
              {profiles.some((p) => p.id === editingProfile.id) && profiles.length > 1 && (
                <Button variant="outline" onClick={() => { deleteProfile(editingProfile.id); setShowProfileEditor(false); setEditingProfile(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <Trash2 size={12} /> Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Logs */}
      {(logs.length > 0 || isRunning) && (
        <div className="animate-scale-in flex overflow-hidden" style={{ height: 320, minHeight: 320, maxHeight: 320 }}>
          <LiveLogs logs={logs} isRunning={isRunning} />
        </div>
      )}
    </div>
    </HistoryPanel>
  );
}
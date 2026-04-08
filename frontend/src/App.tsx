import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { LeadGen } from "./pages/LeadGen";
import type { Lead, LeadSearchHistory } from "./pages/LeadGen";
import { FormFiller } from "./pages/FormFiller";
import type { FormProfile, FormFillRecord } from "./pages/FormFiller";
import { IntelPage } from "./pages/IntelPage";
import { Docs } from "./pages/Docs";
import { Strategy } from "./pages/Strategy";
import type { StrategyHistoryItem } from "./pages/Strategy";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import {
  Radar, BarChart3, Sun, Moon, Zap, Users, FileText, Database,
  BookOpen, Target, PanelLeftClose, PanelLeftOpen, Settings, Brain, Fish, LogOut, User, Shield, Clock, Mail, Phone, Pencil, Check, X, Trash2,
} from "lucide-react";
import type { HistoryItem } from "./components/HistoryList";
import type { Filters } from "./components/SettingsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import type { IntelRecord } from "./components/IntelDataPanel";
import { Home } from "./pages/Home";

function loadJSON<T>(key: string, fb: T): T { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; } }
function saveJSON(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }
const API = "/api/store";
async function bSave(c: string, d: unknown) { try { await fetch(`${API}/${c}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: d }) }); } catch {} }
async function bSaveCfg(d: unknown) { try { await fetch(`${API}/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: d }) }); } catch {} }
async function bLoad(c: string): Promise<any[]> { try { const r = await fetch(`${API}/${c}`); const d = await r.json(); return d.success ? d.data : []; } catch { return []; } }
async function bLoadCfg(): Promise<any> { try { const r = await fetch(`${API}/config`); const d = await r.json(); return d.success ? d.config : null; } catch { return null; } }
const DL = { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "" };

const NAV_ITEMS = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard", color: "#3b82f6" },
  { to: "/", icon: Zap, label: "Agent", color: "#8b5cf6" },
  { to: "/strategy", icon: Target, label: "Strategy", color: "#ef4444" },
  { to: "/leads", icon: Users, label: "Lead Gen", color: "#f59e0b" },
  { to: "/forms", icon: FileText, label: "Forms", color: "#6366f1" },
  { to: "/intel", icon: Database, label: "Intel Data", color: "#06b6d4" },
];

function App() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, login, logout, user, updateProfile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", phone: "", role: "" });
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runId, setRunId] = useState<string | null>(() => loadJSON("cp_runId", null));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadJSON("cp_history", []));
  const [filters, setFilters] = useState<Filters>(() => {
    const s = loadJSON<any>("cp_filters", null);
    return { tasks: s?.tasks||["pricing","jobs","reviews","blog"], maxCompetitors: s?.maxCompetitors||3, executionMode: s?.executionMode||"headless", llm: s?.llm?{...DL,...s.llm}:DL, tinyfishApiKey: s?.tinyfishApiKey||"" };
  });
  const [intelRecords, setIntelRecords] = useState<IntelRecord[]>(() => loadJSON("cp_intel", []));
  const [leads, setLeads] = useState<Lead[]>(() => loadJSON("cp_leads", []));
  const [leadHistory, setLeadHistory] = useState<LeadSearchHistory[]>(() => loadJSON("cp_leadHistory", []));
  const [formProfiles, setFormProfiles] = useState<FormProfile[]>(() => loadJSON("cp_formProfiles", [{ id:"default",name:"Default Profile",fullName:"",email:"",phone:"",company:"",jobTitle:"",website:"",message:"" }]));
  const [fillHistory, setFillHistory] = useState<FormFillRecord[]>(() => loadJSON("cp_fillHistory", []));
  const [leadRunId, setLeadRunId] = useState<string | null>(() => loadJSON("cp_leadRunId", null));
  const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>(() => loadJSON("cp_strategyHistory", []));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => { try {
    const [cfg,h,i,l,lh,fp,fh,sh] = await Promise.all([bLoadCfg(),bLoad("history"),bLoad("intel"),bLoad("leads"),bLoad("leadHistory"),bLoad("formProfiles"),bLoad("fillHistory"),bLoad("strategyHistory")]);
    if(cfg) setFilters({tasks:cfg.tasks||["pricing","jobs","reviews","blog"],maxCompetitors:cfg.maxCompetitors||3,executionMode:cfg.executionMode||"headless",llm:cfg.llm?{...DL,...cfg.llm}:DL,tinyfishApiKey:cfg.tinyfishApiKey||""});
    if(h?.length) setHistory(h); if(i?.length) setIntelRecords(i); if(l?.length) setLeads(l);
    if(lh?.length) setLeadHistory(lh); if(fp?.length) setFormProfiles(fp); if(fh?.length) setFillHistory(fh);
    if(sh?.length) setStrategyHistory(sh);
  } catch(e){console.warn("Backend load failed:",e);} setLoaded(true); })(); }, []);

  useEffect(()=>{saveJSON("cp_runId",runId);},[runId]);
  useEffect(()=>{if(loaded){saveJSON("cp_history",history);bSave("history",history);}},[history,loaded]);
  useEffect(()=>{if(loaded){saveJSON("cp_filters",filters);bSaveCfg(filters);}},[filters,loaded]);
  useEffect(()=>{if(loaded){saveJSON("cp_intel",intelRecords);bSave("intel",intelRecords);}},[intelRecords,loaded]);
  useEffect(()=>{if(loaded){saveJSON("cp_leads",leads);bSave("leads",leads);}},[leads,loaded]);
  useEffect(()=>{if(loaded){saveJSON("cp_leadHistory",leadHistory);bSave("leadHistory",leadHistory);}},[leadHistory,loaded]);
  useEffect(()=>{if(loaded){saveJSON("cp_formProfiles",formProfiles);bSave("formProfiles",formProfiles);}},[formProfiles,loaded]);
  useEffect(()=>{if(loaded){saveJSON("cp_fillHistory",fillHistory);bSave("fillHistory",fillHistory);}},[fillHistory,loaded]);
  useEffect(()=>{saveJSON("cp_leadRunId",leadRunId);},[leadRunId]);
  useEffect(()=>{if(loaded){saveJSON("cp_strategyHistory",strategyHistory);bSave("strategyHistory",strategyHistory);}},[strategyHistory,loaded]);

  const isAdmin = user?.role === "admin";
  const deleteIntelRecord = useCallback((id: string) => setIntelRecords(p=>p.filter(r=>r.id!==id)), []);
  const deleteHistory = useCallback((tid: string) => { setHistory(p=>p.filter(h=>h.runId!==tid)); if(runId===tid) setRunId(null); }, [runId]);
  const deleteLeadHistory = useCallback((id: string) => setLeadHistory(p=>p.filter(h=>h.id!==id)), []);
  const deleteFillHistory = useCallback((id: string) => setFillHistory(p=>p.filter(h=>h.id!==id)), []);
  const clearAllData = useCallback(() => {
    setHistory([]); setIntelRecords([]); setLeads([]); setLeadHistory([]);
    setFormProfiles([{id:"default",name:"Default Profile",fullName:"",email:"",phone:"",company:"",jobTitle:"",website:"",message:""}]);
    setFillHistory([]); setRunId(null); setLeadRunId(null); setStrategyHistory([]);
    ["cp_history","cp_intel","cp_leads","cp_leadHistory","cp_fillHistory","cp_formProfiles","cp_runId","cp_leadRunId","cp_intel_pushed","cp_strategyHistory"].forEach(k=>localStorage.removeItem(k));
    Promise.all(["history","intel","leads","leadHistory","fillHistory","formProfiles","strategyHistory"].map(c=>bSave(c,[])));
  }, []);
  const addReportsToIntel = useCallback((reports: any[]) => {
    const nr: IntelRecord[]=[];
    for(const r of reports){const b={company:r.company||"Unknown",scanDate:new Date().toISOString()};
    if(r.pricing&&(r.pricing.plans?.length>0||Object.keys(r.pricing).length>0))nr.push({...b,id:crypto.randomUUID(),type:"pricing",data:r.pricing});
    const jobs=Array.isArray(r.jobs)?r.jobs:r.jobs?.items||[];if(jobs.length>0)nr.push({...b,id:crypto.randomUUID(),type:"jobs",data:jobs});
    if(r.reviews&&Object.keys(r.reviews).length>0)nr.push({...b,id:crypto.randomUUID(),type:"reviews",data:r.reviews});
    const blog=Array.isArray(r.blog)?r.blog:r.blog?.posts||[];if(blog.length>0)nr.push({...b,id:crypto.randomUUID(),type:"blog",data:blog});
    const feat=Array.isArray(r.features)?r.features:r.features?.items||[];if(feat.length>0)nr.push({...b,id:crypto.randomUUID(),type:"features",data:feat});
    if(r.social&&(Array.isArray(r.social)?r.social.length>0:Object.keys(r.social).length>0))nr.push({...b,id:crypto.randomUUID(),type:"social",data:r.social});}
    if(nr.length>0)setIntelRecords(p=>{const u=[...nr,...p];saveJSON("cp_intel",u);return u;});
  }, []);
  const addLeadsToIntel = useCallback((fl: Lead[],q: string) => {if(!fl.length)return;setIntelRecords(p=>{const u=[{id:crypto.randomUUID(),company:q,scanDate:new Date().toISOString(),type:"leads" as const,data:fl},...p];saveJSON("cp_intel",u);return u;});}, []);
  const addFormFillToIntel = useCallback((fr: FormFillRecord) => {if(fr.status==="running")return;let co=fr.url;try{if(fr.url.startsWith("http"))co=new URL(fr.url).hostname.replace("www.","");}catch{}setIntelRecords(p=>{const u=[{id:crypto.randomUUID(),company:co,scanDate:fr.timestamp,type:"forms" as const,data:fr},...p];saveJSON("cp_intel",u);return u;});}, []);
  const addStrategyToIntel = useCallback((tool: string, input: string, result: any) => {
    if (!result) return;
    const toolLabel = tool === "market" ? "Market Breakdown" : tool === "distribution" ? "Distribution Plan" : "Competitor Weakness Map";
    setIntelRecords(p => {
      const u = [{ id: crypto.randomUUID(), company: `${toolLabel}: ${input}`, scanDate: new Date().toISOString(), type: "strategy" as const, data: result }, ...p];
      saveJSON("cp_intel", u); return u;
    });
  }, []);

  // ── Auth gate: show landing or login if not authenticated ──
  if (!isAuthenticated) {
    if (showLogin) {
      return <LoginPage onLogin={(u) => { login(u); setShowLogin(false); }} />;
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        {/* ── Left Sidebar ── */}
        <aside className="flex flex-col border-r shrink-0 transition-all duration-300 ease-in-out"
          style={{ width: sidebarOpen ? 220 : 64, minWidth: sidebarOpen ? 220 : 64, backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border)" }}>

          {/* Logo — always visible */}
          <div className="flex items-center justify-center px-3 py-1.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Radar size={20} />
            </div>
            {sidebarOpen && (
              <span className="ml-3 text-base font-bold animate-fade-in truncate" style={{ color: "var(--text-primary)" }}>
                CompetitorPulse
              </span>
            )}
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => <SidebarLink key={item.to} {...item} collapsed={!sidebarOpen} />)}
          </nav>

          {/* Expand/Collapse + Logout — bottom of menu */}
          <div className="px-2 py-3 shrink-0 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--bg-input)" }}>
                {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </span>
              {sidebarOpen && <span className="text-sm font-medium animate-fade-in">Collapse</span>}
            </button>
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{ color: "#ef4444" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
                <LogOut size={18} />
              </span>
              {sidebarOpen && <span className="text-sm font-medium animate-fade-in">Logout</span>}
            </button>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Top bar */}
          <header className="flex items-center justify-end gap-2 px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
            <TopButton to="/docs" icon={<BookOpen size={16} />} label="Docs" />
            <button onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: settingsOpen ? "var(--accent-soft)" : "var(--bg-input)",
                color: settingsOpen ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${settingsOpen ? "var(--accent)" : "var(--border)"}`,
              }}>
              <Settings size={16} /> Settings
            </button>
            <button onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* API Key Status Icons */}
            <div className="flex items-center gap-1.5">
              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 cursor-default"
                style={{ backgroundColor: "var(--bg-input)" }} title={filters.tinyfishApiKey ? "TinyFish: Connected" : "TinyFish: No API key"}>
                <Fish size={15} style={{ color: "#f97316" }} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ backgroundColor: filters.tinyfishApiKey ? "#22c55e" : "#ef4444", borderColor: "var(--bg-card)" }} />
              </div>
              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 cursor-default"
                style={{ backgroundColor: "var(--bg-input)" }} title={filters.llm?.apiKey ? "LLM: Connected" : "LLM: No API key"}>
                <Brain size={15} style={{ color: "#8b5cf6" }} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ backgroundColor: filters.llm?.apiKey ? "#22c55e" : "#ef4444", borderColor: "var(--bg-card)" }} />
              </div>
            </div>
            {/* Profile Icon */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                title="Profile">
                <User size={16} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-72 rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  {/* Profile header */}
                  <div className="px-5 pt-5 pb-4 text-center relative" style={{ borderBottom: "1px solid var(--border)", background: "linear-gradient(135deg, #6366f115, #8b5cf615)" }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}>
                      <User size={24} />
                    </div>
                    {profileEditing ? (
                      <input value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                        className="w-full text-sm font-bold text-center rounded-lg px-2 py-1 outline-none"
                        style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                    ) : (
                      <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{user?.username || "User"}</div>
                    )}
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{user?.role || "Admin"}</div>
                    {!profileEditing && (
                      <button onClick={() => { setEditForm({ username: user?.username || "", phone: user?.phone || "", role: user?.role || "" }); setProfileEditing(true); }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                        title="Edit Profile">
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                  {/* Profile details */}
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Shield size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</div>
                        {profileEditing ? (
                          <input value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                            className="w-full text-xs font-medium rounded px-1.5 py-0.5 outline-none mt-0.5"
                            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                        ) : (
                          <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{user?.role || "Admin"}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Email</div>
                        <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{(profileEditing ? editForm.username : user?.username) || "admin"}@competitorpulse.io</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Mobile</div>
                        {profileEditing ? (
                          <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                            className="w-full text-xs font-medium rounded px-1.5 py-0.5 outline-none mt-0.5"
                            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                        ) : (
                          <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{user?.phone || "+1 (555) 123-4567"}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Login Time</div>
                        <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{user?.loginTime ? new Date(user.loginTime).toLocaleString() : "—"}</div>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                    {profileEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => { updateProfile({ username: editForm.username.trim() || user?.username || "admin", phone: editForm.phone, role: editForm.role }); setProfileEditing(false); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:brightness-110"
                          style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                          <Check size={14} /> Save
                        </button>
                        <button onClick={() => setProfileEditing(false)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:brightness-110"
                          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)" }}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setProfileOpen(false); logout(); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:brightness-110"
                        style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        <LogOut size={14} /> Sign Out
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Content + Settings Panel side by side */}
          <div className="flex-1 flex overflow-hidden">
            {/* Page content */}
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Home runId={runId} setRunId={setRunId} history={history} setHistory={setHistory} filters={filters} setFilters={setFilters} onReportsReady={addReportsToIntel} onDeleteHistory={deleteHistory} isAdmin={isAdmin} />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/strategy" element={<Strategy strategyHistory={strategyHistory} setStrategyHistory={setStrategyHistory} onResultReady={addStrategyToIntel} />} />
                <Route path="/intel" element={<IntelPage records={intelRecords} onDelete={deleteIntelRecord} isAdmin={isAdmin} />} />
                <Route path="/leads" element={<LeadGen leads={leads} setLeads={setLeads} leadHistory={leadHistory} setLeadHistory={setLeadHistory} onDeleteHistory={deleteLeadHistory} leadRunId={leadRunId} setLeadRunId={setLeadRunId} onLeadsReady={addLeadsToIntel} isAdmin={isAdmin} />} />
                <Route path="/forms" element={<FormFiller profiles={formProfiles} setProfiles={setFormProfiles} fillHistory={fillHistory} setFillHistory={setFillHistory} onFormFillDone={addFormFillToIntel} onDeleteFillHistory={deleteFillHistory} isAdmin={isAdmin} />} />
              </Routes>
            </main>

            {/* Settings slide-out panel */}
            {settingsOpen && (
              <aside className="w-80 shrink-0 border-l overflow-y-auto p-4 animate-slide-right"
                style={{ backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border)" }}>
                <SettingsPanel filters={filters} onChange={setFilters} mode="keys-only" />
                {isAdmin && (
                  <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Admin — Danger Zone</div>
                    <button onClick={() => { if (window.confirm("Delete ALL data? This removes all history, leads, intel records, campaigns, and fill history. This cannot be undone.")) clearAllData(); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
                      style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1.5px solid rgba(239,68,68,0.2)" }}>
                      <Trash2 size={14} /> Clear All Data
                    </button>
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

/* ── Top bar button ── */
function TopButton({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <button onClick={() => navigate(to)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: active ? "var(--accent-soft)" : "var(--bg-input)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}>
      {icon} {label}
    </button>
  );
}

/* ── Sidebar Link with colorful icons + working tooltip ── */
function SidebarLink({ to, icon: Icon, label, color, collapsed }: {
  to: string; icon: any; label: string; color: string; collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  const [hovered, setHovered] = useState(false);
  const [tooltipY, setTooltipY] = useState(0);
  const ref = useState<HTMLDivElement | null>(null);

  return (
    <div className="relative"
      ref={(el) => { ref[1](el); }}
      onMouseEnter={(e) => {
        setHovered(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipY(rect.top + rect.height / 2);
      }}
      onMouseLeave={() => setHovered(false)}>
      <NavLink to={to}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 no-underline"
        style={{
          backgroundColor: isActive ? `${color}15` : hovered ? "var(--bg-hover)" : "transparent",
        }}>
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ backgroundColor: color }} />}
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
          style={{
            backgroundColor: `${color}15`,
            color: color,
            transform: hovered ? "scale(1.1)" : "scale(1)",
            boxShadow: isActive ? `0 2px 8px ${color}25` : "none",
          }}>
          <Icon size={18} />
        </span>
        {!collapsed && (
          <span className="text-sm font-medium animate-fade-in truncate"
            style={{ color: isActive ? color : "var(--text-primary)" }}>{label}</span>
        )}
      </NavLink>

      {/* Tooltip — fixed position, portal-like */}
      {collapsed && hovered && (
        <div className="fixed z-[9999] pointer-events-none animate-scale-in"
          style={{ left: 72, top: tooltipY - 14 }}>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: color, color: "#fff", boxShadow: `0 4px 12px ${color}40` }}>
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

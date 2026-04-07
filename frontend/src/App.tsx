import { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { LeadGen } from "./pages/LeadGen";
import type { Lead, LeadSearchHistory } from "./pages/LeadGen";
import { FormFiller } from "./pages/FormFiller";
import type { FormProfile, FormFillRecord } from "./pages/FormFiller";
import { IntelPage } from "./pages/IntelPage";
import { Docs } from "./pages/Docs";
import { Strategy } from "./pages/Strategy";
import { useTheme } from "./context/ThemeContext";
import { Radar, BarChart3, Sun, Moon, Zap, Users, FileText, Database, BookOpen, Target } from "lucide-react";
import type { HistoryItem } from "./components/HistoryList";
import type { Filters } from "./components/SettingsPanel";
import type { IntelRecord } from "./components/IntelDataPanel";

function loadJSON<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function saveJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

// Backend sync helpers
const API = "/api/store";
async function backendSave(collection: string, data: unknown) {
  try { await fetch(`${API}/${collection}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) }); } catch {}
}
async function backendSaveConfig(config: unknown) {
  try { await fetch(`${API}/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) }); } catch {}
}
async function backendLoad(collection: string): Promise<any[]> {
  try { const r = await fetch(`${API}/${collection}`); const d = await r.json(); return d.success ? d.data : []; } catch { return []; }
}
async function backendLoadConfig(): Promise<any> {
  try { const r = await fetch(`${API}/config`); const d = await r.json(); return d.success ? d.config : null; } catch { return null; }
}

const DL = { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "" };

function App() {
  const { theme, toggleTheme } = useTheme();
  const [runId, setRunId] = useState<string | null>(() => loadJSON("cp_runId", null));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadJSON("cp_history", []));
  const [filters, setFilters] = useState<Filters>(() => {
    const s = loadJSON<any>("cp_filters", null);
    return {
      tasks: s?.tasks || ["pricing", "jobs", "reviews", "blog"],
      maxCompetitors: s?.maxCompetitors || 3,
      executionMode: s?.executionMode || "headless",
      llm: s?.llm ? { ...DL, ...s.llm } : DL,
      tinyfishApiKey: s?.tinyfishApiKey || "",
    };
  });
  const [intelRecords, setIntelRecords] = useState<IntelRecord[]>(() => loadJSON("cp_intel", []));
  const [leads, setLeads] = useState<Lead[]>(() => loadJSON("cp_leads", []));
  const [leadHistory, setLeadHistory] = useState<LeadSearchHistory[]>(() => loadJSON("cp_leadHistory", []));
  const [formProfiles, setFormProfiles] = useState<FormProfile[]>(() => loadJSON("cp_formProfiles", [{
    id: "default", name: "Default Profile", fullName: "", email: "", phone: "",
    company: "", jobTitle: "", website: "", message: "",
  }]));
  const [fillHistory, setFillHistory] = useState<FormFillRecord[]>(() => loadJSON("cp_fillHistory", []));
  const [leadRunId, setLeadRunId] = useState<string | null>(() => loadJSON("cp_leadRunId", null));
  const [loaded, setLoaded] = useState(false);

  // Load from backend on mount FIRST (backend is source of truth)
  useEffect(() => {
    (async () => {
      try {
        const [cfg, hist, intel, lds, lh, fp, fh] = await Promise.all([
          backendLoadConfig(), backendLoad("history"), backendLoad("intel"),
          backendLoad("leads"), backendLoad("leadHistory"),
          backendLoad("formProfiles"), backendLoad("fillHistory"),
        ]);
        if (cfg) setFilters({ tasks: cfg.tasks || ["pricing","jobs","reviews","blog"], maxCompetitors: cfg.maxCompetitors || 3, executionMode: cfg.executionMode || "headless", llm: cfg.llm ? { ...DL, ...cfg.llm } : DL, tinyfishApiKey: cfg.tinyfishApiKey || "" });
        if (hist?.length > 0) setHistory(hist);
        if (intel?.length > 0) setIntelRecords(intel);
        if (lds?.length > 0) setLeads(lds);
        if (lh?.length > 0) setLeadHistory(lh);
        if (fp?.length > 0) setFormProfiles(fp);
        if (fh?.length > 0) setFillHistory(fh);
      } catch (e) { console.warn("Backend load failed, using localStorage:", e); }
      setLoaded(true);
    })();
  }, []);

  // Save to localStorage + backend ONLY after initial load completes
  useEffect(() => { saveJSON("cp_runId", runId); }, [runId]);
  useEffect(() => { if (loaded) { saveJSON("cp_history", history); backendSave("history", history); } }, [history, loaded]);
  useEffect(() => { if (loaded) { saveJSON("cp_filters", filters); backendSaveConfig(filters); } }, [filters, loaded]);
  useEffect(() => { if (loaded) { saveJSON("cp_intel", intelRecords); backendSave("intel", intelRecords); } }, [intelRecords, loaded]);
  useEffect(() => { if (loaded) { saveJSON("cp_leads", leads); backendSave("leads", leads); } }, [leads, loaded]);
  useEffect(() => { if (loaded) { saveJSON("cp_leadHistory", leadHistory); backendSave("leadHistory", leadHistory); } }, [leadHistory, loaded]);
  useEffect(() => { if (loaded) { saveJSON("cp_formProfiles", formProfiles); backendSave("formProfiles", formProfiles); } }, [formProfiles, loaded]);
  useEffect(() => { if (loaded) { saveJSON("cp_fillHistory", fillHistory); backendSave("fillHistory", fillHistory); } }, [fillHistory, loaded]);
  useEffect(() => { saveJSON("cp_leadRunId", leadRunId); }, [leadRunId]);

  const deleteIntelRecord = useCallback((id: string) => {
    setIntelRecords((p) => p.filter((r) => r.id !== id));
  }, []);
  const deleteHistory = useCallback((tid: string) => {
    setHistory((p) => p.filter((h) => h.runId !== tid));
    if (runId === tid) setRunId(null);
  }, [runId]);
  const deleteLeadHistory = useCallback((id: string) => {
    setLeadHistory((p) => p.filter((h) => h.id !== id));
  }, []);

  const addReportsToIntel = useCallback((reports: any[]) => {
    const nr: IntelRecord[] = [];
    for (const r of reports) {
      const b = { company: r.company || "Unknown", scanDate: new Date().toISOString() };
      if (r.pricing && (r.pricing.plans?.length > 0 || Object.keys(r.pricing).length > 0))
        nr.push({ ...b, id: crypto.randomUUID(), type: "pricing", data: r.pricing });
      const jobs = Array.isArray(r.jobs) ? r.jobs : r.jobs?.items || [];
      if (jobs.length > 0) nr.push({ ...b, id: crypto.randomUUID(), type: "jobs", data: jobs });
      if (r.reviews && Object.keys(r.reviews).length > 0)
        nr.push({ ...b, id: crypto.randomUUID(), type: "reviews", data: r.reviews });
      const blog = Array.isArray(r.blog) ? r.blog : r.blog?.posts || [];
      if (blog.length > 0) nr.push({ ...b, id: crypto.randomUUID(), type: "blog", data: blog });
      const feat = Array.isArray(r.features) ? r.features : r.features?.items || [];
      if (feat.length > 0) nr.push({ ...b, id: crypto.randomUUID(), type: "features", data: feat });
      if (r.social && (Array.isArray(r.social) ? r.social.length > 0 : Object.keys(r.social).length > 0))
        nr.push({ ...b, id: crypto.randomUUID(), type: "social", data: r.social });
    }
    if (nr.length > 0) {
      setIntelRecords((p) => { const u = [...nr, ...p]; saveJSON("cp_intel", u); return u; });
    }
  }, []);

  const addLeadsToIntel = useCallback((fl: Lead[], q: string) => {
    if (fl.length === 0) return;
    const rec: IntelRecord = {
      id: crypto.randomUUID(), company: q,
      scanDate: new Date().toISOString(), type: "leads", data: fl,
    };
    setIntelRecords((p) => { const u = [rec, ...p]; saveJSON("cp_intel", u); return u; });
  }, []);

  const addFormFillToIntel = useCallback((fr: FormFillRecord) => {
    if (fr.status === "running") return;
    let co = fr.url;
    try { if (fr.url.startsWith("http")) co = new URL(fr.url).hostname.replace("www.", ""); } catch { /* ok */ }
    const rec: IntelRecord = {
      id: crypto.randomUUID(), company: co,
      scanDate: fr.timestamp, type: "forms", data: fr,
    };
    setIntelRecords((p) => { const u = [rec, ...p]; saveJSON("cp_intel", u); return u; });
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <nav
          className="sticky top-0 z-50 backdrop-blur-xl border-b px-6 py-3 flex items-center"
          style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <Radar size={18} />
            </div>
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              CompetitorPulse
            </span>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
              <NL to="/" icon={<Zap size={14} />} label="Agent" grad="from-blue-500 to-purple-600" />
              <NL to="/forms" icon={<FileText size={14} />} label="Forms" grad="from-indigo-500 to-purple-600" />
              <NL to="/leads" icon={<Users size={14} />} label="Lead Gen" grad="from-amber-500 to-red-500" />
              <NL to="/intel" icon={<Database size={14} />} label="Intel Data" grad="from-cyan-500 to-blue-500" />
              <NL to="/dashboard" icon={<BarChart3 size={14} />} label="Dashboard" grad="from-blue-500 to-purple-600" />
              <NL to="/strategy" icon={<Target size={14} />} label="Strategy" grad="from-amber-500 to-red-500" />
              <NL to="/docs" icon={<BookOpen size={14} />} label="Docs" grad="from-emerald-500 to-teal-500" />
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 shrink-0"
            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
        <Routes>
          <Route path="/" element={
            <Home runId={runId} setRunId={setRunId} history={history} setHistory={setHistory}
              filters={filters} setFilters={setFilters} onReportsReady={addReportsToIntel}
              onDeleteHistory={deleteHistory} />
          } />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/strategy" element={<Strategy />} />
          <Route path="/intel" element={<IntelPage records={intelRecords} onDelete={deleteIntelRecord} />} />
          <Route path="/leads" element={
            <LeadGen leads={leads} setLeads={setLeads} leadHistory={leadHistory}
              setLeadHistory={setLeadHistory} onDeleteHistory={deleteLeadHistory}
              leadRunId={leadRunId} setLeadRunId={setLeadRunId} onLeadsReady={addLeadsToIntel} />
          } />
          <Route path="/forms" element={
            <FormFiller profiles={formProfiles} setProfiles={setFormProfiles}
              fillHistory={fillHistory} setFillHistory={setFillHistory}
              onFormFillDone={addFormFillToIntel} />
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function NL({ to, icon, label, grad }: { to: string; icon: React.ReactNode; label: string; grad: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-tab flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-medium transition-all duration-300 ${
          isActive ? `nav-tab-active bg-gradient-to-r ${grad} text-white shadow-md` : "hover:scale-105"
        }`
      }
      style={({ isActive }) => (isActive ? {} : { color: "var(--text-secondary)" })}
    >
      {icon} {label}
    </NavLink>
  );
}

export default App;

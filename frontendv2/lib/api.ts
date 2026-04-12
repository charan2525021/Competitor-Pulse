"use client"

const API_BASE = "/api";

// SSE EventSource must connect directly to the Express backend
// because Next.js rewrites buffer responses and break SSE streaming.
const SSE_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : "http://localhost:3001/api";

/* ── Agent ── */

export async function startAgent(prompt: string, filters: Record<string, any>) {
  const res = await fetch(`${API_BASE}/agent/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, filters, llm: filters.llm, tinyfishApiKey: filters.tinyfishApiKey }),
  });
  return res.json();
}

export async function fetchRunReports(runId: string) {
  const res = await fetch(`${API_BASE}/agent/reports/${runId}`);
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  return res.json();
}

export function createLogStream(
  runId: string,
  onMessage: (data: any) => void,
  onDone: (reports?: any[]) => void
) {
  const es = new EventSource(`${SSE_BASE}/agent/logs/${runId}`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
    if (data.type === "complete") { es.close(); onDone(data.reports); }
  };
  es.onerror = () => { es.close(); onDone(); };
  return es;
}

export async function cancelAgent(runId: string) {
  const res = await fetch(`${API_BASE}/agent/cancel/${runId}`, { method: "POST" });
  return res.json();
}

/* ── Lead Search SSE ── */

export async function startLeadSearch(query: string) {
  let tinyfishApiKey = "";
  try { const cfg = JSON.parse(localStorage.getItem("cp_filters") || "{}"); tinyfishApiKey = cfg.tinyfishApiKey || ""; } catch {}
  const res = await fetch(`${API_BASE}/leads/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, tinyfishApiKey }),
  });
  return res.json();
}

export function createLeadLogStream(
  runId: string,
  onMessage: (data: any) => void,
  onDone: (leads?: any[]) => void
) {
  const es = new EventSource(`${SSE_BASE}/leads/logs/${runId}`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
    if (data.type === "complete") { es.close(); onDone(data.leads); }
  };
  es.onerror = () => { es.close(); onDone(); };
  return es;
}

export async function fetchLeadResults(runId: string) {
  const res = await fetch(`${API_BASE}/leads/results/${runId}`);
  return res.json();
}

export async function cancelLeadSearch(runId: string) {
  const res = await fetch(`${API_BASE}/leads/cancel/${runId}`, { method: "POST" });
  return res.json();
}

/* ── Form Filler ── */

export async function startFormFill(companyName: string, formType: string, profile: Record<string, any>, instructions?: string) {
  let tinyfishApiKey = "";
  try { const cfg = JSON.parse(localStorage.getItem("cp_filters") || "{}"); tinyfishApiKey = cfg.tinyfishApiKey || ""; } catch {}
  const res = await fetch(`${API_BASE}/forms/fill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName, formType, profile, instructions, tinyfishApiKey }),
  });
  return res.json();
}

export function createFormLogStream(
  runId: string,
  onMessage: (data: any) => void,
  onDone: (result?: any) => void
) {
  const es = new EventSource(`${SSE_BASE}/forms/logs/${runId}`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
    if (data.type === "complete") { es.close(); onDone(data.result); }
  };
  es.onerror = () => { es.close(); onDone(); };
  return es;
}

export async function cancelFormFill(runId: string) {
  const res = await fetch(`${API_BASE}/forms/cancel/${runId}`, { method: "POST" });
  return res.json();
}

/* ── Backend Persistent Store ── */

export async function loadConfig(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/store/config`);
    const data = await res.json();
    return data.success ? data.config : null;
  } catch { return null; }
}

export async function saveConfig(config: any): Promise<void> {
  try {
    await fetch(`${API_BASE}/store/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
  } catch { /* silent */ }
}

export async function loadCollection(name: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/store/${name}`);
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function saveCollection(name: string, data: any[]): Promise<void> {
  try {
    await fetch(`${API_BASE}/store/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  } catch { /* silent */ }
}

export async function deleteCollectionItem(name: string, id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/store/${name}/${id}`, { method: "DELETE" });
  } catch { /* silent */ }
}

/* ── Strategy Tools ── */

export async function startStrategy(tool: string, input: string, llm?: any, tinyfishApiKey?: string) {
  const res = await fetch(`${API_BASE}/strategy/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, input, llm, tinyfishApiKey }),
  });
  return res.json();
}

export function createStrategyLogStream(
  runId: string,
  onMessage: (data: any) => void,
  onDone: (result?: any) => void
) {
  const es = new EventSource(`${API_BASE}/strategy/logs/${runId}`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
    if (data.type === "complete") { es.close(); onDone(data.result); }
  };
  es.onerror = () => { es.close(); onDone(); };
  return es;
}

export async function cancelStrategy(runId: string) {
  const res = await fetch(`${API_BASE}/strategy/cancel/${runId}`, { method: "POST" });
  return res.json();
}

/* ── Outreach / Campaigns ── */

export async function saveSenderIdentity(fromName: string, fromEmail: string, useGmailSmtp: boolean, gmailAppPassword?: string) {
  const res = await fetch(`${API_BASE}/outreach/senders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromName, fromEmail, useGmailSmtp, gmailAppPassword }),
  });
  return res.json();
}

export async function getSenderIdentities() {
  const res = await fetch(`${API_BASE}/outreach/senders`);
  return res.json();
}

export async function deleteSenderApi(id: string) {
  const res = await fetch(`${API_BASE}/outreach/senders/${id}`, { method: "DELETE" });
  return res.json();
}

export async function createCampaignApi(data: {
  name: string; subject: string; body: string;
  senderId: string; leads: any[];
}) {
  const res = await fetch(`${API_BASE}/outreach/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getCampaignsApi() {
  const res = await fetch(`${API_BASE}/outreach/campaigns`);
  return res.json();
}

export async function deleteCampaignApi(id: string) {
  const res = await fetch(`${API_BASE}/outreach/campaigns/${id}`, { method: "DELETE" });
  return res.json();
}

export async function sendCampaignApi(id: string) {
  const res = await fetch(`${API_BASE}/outreach/campaigns/${id}/send`, { method: "POST" });
  return res.json();
}

export async function getCampaignLogsApi(id: string) {
  const res = await fetch(`${API_BASE}/outreach/campaigns/${id}/logs`);
  return res.json();
}

// localStorage utilities for data persistence

import type { 
  Analysis, 
  Lead, 
  FormSubmission, 
  IntelRecord, 
  HistoryItem,
  Settings 
} from "./types"

const STORAGE_KEYS = {
  ANALYSES: "competitorpulse_analyses",
  LEADS: "competitorpulse_leads",
  FORMS: "competitorpulse_forms",
  INTEL: "competitorpulse_intel",
  HISTORY: "competitorpulse_history",
  SETTINGS: "competitorpulse_settings",
} as const

// Generic storage helpers
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error("Failed to save to localStorage:", e)
  }
}

// Analyses
export function getAnalyses(): Analysis[] {
  return getItem<Analysis[]>(STORAGE_KEYS.ANALYSES, [])
}

export function saveAnalysis(analysis: Analysis): void {
  const analyses = getAnalyses()
  const index = analyses.findIndex(a => a.id === analysis.id)
  if (index >= 0) {
    analyses[index] = analysis
  } else {
    analyses.unshift(analysis)
  }
  setItem(STORAGE_KEYS.ANALYSES, analyses)
}

export function deleteAnalysis(id: string): void {
  const analyses = getAnalyses().filter(a => a.id !== id)
  setItem(STORAGE_KEYS.ANALYSES, analyses)
}

// Leads
export function getLeads(): Lead[] {
  return getItem<Lead[]>(STORAGE_KEYS.LEADS, [])
}

export function saveLead(lead: Lead): void {
  const leads = getLeads()
  const index = leads.findIndex(l => l.id === lead.id)
  if (index >= 0) {
    leads[index] = lead
  } else {
    leads.unshift(lead)
  }
  setItem(STORAGE_KEYS.LEADS, leads)
}

export function deleteLeads(ids: string[]): void {
  const leads = getLeads().filter(l => !ids.includes(l.id))
  setItem(STORAGE_KEYS.LEADS, leads)
}

// Forms
export function getForms(): FormSubmission[] {
  return getItem<FormSubmission[]>(STORAGE_KEYS.FORMS, [])
}

export function saveForm(form: FormSubmission): void {
  const forms = getForms()
  const index = forms.findIndex(f => f.id === form.id)
  if (index >= 0) {
    forms[index] = form
  } else {
    forms.unshift(form)
  }
  setItem(STORAGE_KEYS.FORMS, forms)
}

// Intel
export function getIntel(): IntelRecord[] {
  return getItem<IntelRecord[]>(STORAGE_KEYS.INTEL, [])
}

export function saveIntel(record: IntelRecord): void {
  const intel = getIntel()
  intel.unshift(record)
  setItem(STORAGE_KEYS.INTEL, intel)
}

export function saveIntelBatch(records: IntelRecord[]): void {
  const intel = getIntel()
  setItem(STORAGE_KEYS.INTEL, [...records, ...intel])
}

// History
export function getHistory(): HistoryItem[] {
  return getItem<HistoryItem[]>(STORAGE_KEYS.HISTORY, [])
}

export function addHistoryItem(item: HistoryItem): void {
  const history = getHistory()
  history.unshift(item)
  // Keep only last 100 items
  setItem(STORAGE_KEYS.HISTORY, history.slice(0, 100))
}

export function clearHistory(): void {
  setItem(STORAGE_KEYS.HISTORY, [])
}

// Settings
export function getSettings(): Settings {
  return getItem<Settings>(STORAGE_KEYS.SETTINGS, {
    theme: "dark",
    notifications: true,
    autoAnalyze: false,
    dataRetention: 30,
  })
}

export function saveSettings(settings: Settings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings)
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

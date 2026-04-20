// CompetitorPulse Types

export interface Analysis {
  id: string
  url: string
  domain: string
  timestamp: string
  status: "pending" | "running" | "completed" | "failed"
  pricing?: PricingData
  jobs?: JobData
  reviews?: ReviewData
  insights?: string[]
}

export interface PricingData {
  tiers: PricingTier[]
  comparison?: string
}

export interface PricingTier {
  name: string
  price: string
  features: string[]
}

export interface JobData {
  totalOpenings: number
  departments: { name: string; count: number; trend: "up" | "down" | "stable" }[]
  recentPostings: { title: string; location: string; date: string }[]
}

export interface ReviewData {
  averageRating: number
  totalReviews: number
  platforms: { name: string; rating: number; count: number }[]
  topComplaints: string[]
  topPraises: string[]
}

export interface EmailSuggestion {
  email: string
  confidence: number
  pattern: string
}

export interface Lead {
  id: string
  name: string
  title: string
  company: string
  email?: string
  emailConfidence?: number
  emailSuggestions?: EmailSuggestion[]
  linkedinUrl?: string
  location?: string
  industry?: string
  source?: string
  addedAt?: string
}

export interface FormSubmission {
  id: string
  url: string
  formName?: string
  fields: Record<string, string>
  status: "pending" | "success" | "failed"
  submittedAt: Date
  error?: string
}

export interface FormField {
  name: string
  type: string
  value: string
  required: boolean
}

export interface IntelRecord {
  id: string
  type: "pricing" | "jobs" | "reviews" | "strategy" | "news" | "social"
  source: string
  title: string
  summary: string
  data?: Record<string, unknown>
  tags?: string[]
  collectedAt: Date
  confidence: number
}

export interface HistoryItem {
  id: string
  type: "analysis" | "lead" | "form" | "intel"
  action: string
  target: string
  timestamp: string
  status: "success" | "failed" | "pending"
  details?: string
}

export interface HistoryEntry {
  id: string
  type: "analysis" | "lead_search" | "form_submit" | "intel_collect"
  action: string
  target: string
  timestamp: Date
  status: "success" | "failed" | "pending"
  details?: string
  duration?: number
}

export interface AgentLog {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error" | "action"
  message: string
  details?: string
}

export interface CompetitorReport {
  id: string
  competitor: string
  analyzedAt: string
  pricing?: {
    model: string
    plans: Array<{ name: string; price: string; features: string[] }>
  }
  jobs?: {
    total: number
    byDepartment: Array<{ name: string; count: number; growth: number }>
  }
  reviews?: {
    averageRating: number
    totalCount: number
    byPlatform: Array<{ name: string; rating: number; count: number }>
    sentiment: { positive: number; neutral: number; negative: number }
  }
  insights?: string[]
}

export interface Settings {
  theme: "light" | "dark"
  notifications: boolean
  autoAnalyze: boolean
  dataRetention: number
  apiKey?: string
}

export type NavItem = 
  | "home"
  | "dashboard" 
  | "agent" 
  | "strategy" 
  | "leads" 
  | "forms" 
  | "intel" 
  | "history" 
  | "docs"
  | "settings"

export interface AnalysisResult {
  competitor: {
    name: string
    domain: string
  }
  pricing?: {
    tiers: Array<{ name: string; price: string; features: string[] }>
    model: string
  }
  jobs?: {
    total: number
    departments: Array<{ name: string; count: number; trend: number }>
    recentPostings: Array<{ title: string; location: string; date: string }>
  }
  reviews?: {
    overallRating: number
    platforms: Array<{ name: string; rating: number; count: number }>
    sentiment: { positive: number; neutral: number; negative: number }
    topComplaints: string[]
  }
  insights?: {
    summary: string
    recommendations: Array<{ title: string; description: string; priority: string }>
    opportunities: string[]
    threats: string[]
  }
}

export interface UserSettings {
  theme: "light" | "dark"
  notifications: {
    email: boolean
    push: boolean
    analysisComplete: boolean
    weeklyDigest: boolean
  }
  profile: {
    name: string
    email: string
    company: string
  }
}

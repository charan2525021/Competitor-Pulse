// In-memory run store for tracking active agent runs
// Each controller maintains its own store for active operations

export interface AgentLog {
  timestamp: Date
  type: "info" | "success" | "warning" | "error" | "action"
  message: string
  details?: string
}

export interface CompetitorIntel {
  competitor: string
  url: string
  pricing?: {
    model: string
    plans: Array<{ name: string; price: string; features: string[] }>
  }
  jobs?: {
    total: number
    departments: Array<{ name: string; count: number; growth: number }>
    recentPostings?: Array<{ title: string; location: string; date: string }>
  }
  reviews?: {
    averageRating: number
    totalCount: number
    platforms: Array<{ name: string; rating: number; count: number }>
    sentiment: { positive: number; neutral: number; negative: number }
    topComplaints?: string[]
  }
  blog?: {
    postCount: number
    topics: string[]
    recentPosts?: Array<{ title: string; date: string; url: string }>
  }
  features?: {
    categories: Array<{ name: string; features: string[] }>
    highlights?: string[]
  }
  social?: {
    platforms: Array<{ name: string; followers: number; engagement: number }>
    recentActivity?: string[]
  }
  insights?: string[]
}

export interface AgentRun {
  id: string
  logs: AgentLog[]
  done: boolean
  reports: CompetitorIntel[]
  abortController: AbortController
  tinyFishRunId?: string
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface StrategyRun {
  id: string
  logs: AgentLog[]
  done: boolean
  result?: unknown
  abortController: AbortController
  tinyFishRunId?: string
}

export interface LeadRun {
  id: string
  logs: AgentLog[]
  done: boolean
  leads: Array<{
    name: string
    title: string
    company: string
    email?: string
    emailConfidence?: number
    linkedinUrl?: string
  }>
  abortController: AbortController
  tinyFishRunId?: string
}

export interface FormRun {
  id: string
  logs: AgentLog[]
  done: boolean
  result?: {
    success: boolean
    filledFields?: Record<string, string>
    confirmationMessage?: string
    error?: string
  }
  abortController: AbortController
  tinyFishRunId?: string
}

// Global stores (module-level state persists across requests in serverless, but not across instances)
const agentRunStore = new Map<string, AgentRun>()
const strategyRunStore = new Map<string, StrategyRun>()
const leadRunStore = new Map<string, LeadRun>()
const formRunStore = new Map<string, FormRun>()

// Agent run store functions
export function createAgentRun(id: string): AgentRun {
  const run: AgentRun = {
    id,
    logs: [],
    done: false,
    reports: [],
    abortController: new AbortController(),
    startedAt: new Date(),
  }
  agentRunStore.set(id, run)
  return run
}

export function getAgentRun(id: string): AgentRun | undefined {
  return agentRunStore.get(id)
}

export function addAgentLog(id: string, log: Omit<AgentLog, "timestamp">): void {
  const run = agentRunStore.get(id)
  if (run) {
    run.logs.push({ ...log, timestamp: new Date() })
  }
}

export function completeAgentRun(id: string, reports: CompetitorIntel[]): void {
  const run = agentRunStore.get(id)
  if (run) {
    run.done = true
    run.reports = reports
    run.completedAt = new Date()
  }
}

export function failAgentRun(id: string, error: string): void {
  const run = agentRunStore.get(id)
  if (run) {
    run.done = true
    run.error = error
    run.completedAt = new Date()
  }
}

export function getAllAgentRuns(): AgentRun[] {
  return Array.from(agentRunStore.values())
}

export function getCompletedAgentRuns(): AgentRun[] {
  return Array.from(agentRunStore.values()).filter(run => run.done && !run.error)
}

// Strategy run store functions
export function createStrategyRun(id: string): StrategyRun {
  const run: StrategyRun = {
    id,
    logs: [],
    done: false,
    abortController: new AbortController(),
  }
  strategyRunStore.set(id, run)
  return run
}

export function getStrategyRun(id: string): StrategyRun | undefined {
  return strategyRunStore.get(id)
}

export function addStrategyLog(id: string, log: Omit<AgentLog, "timestamp">): void {
  const run = strategyRunStore.get(id)
  if (run) {
    run.logs.push({ ...log, timestamp: new Date() })
  }
}

export function completeStrategyRun(id: string, result: unknown): void {
  const run = strategyRunStore.get(id)
  if (run) {
    run.done = true
    run.result = result
  }
}

// Lead run store functions
export function createLeadRun(id: string): LeadRun {
  const run: LeadRun = {
    id,
    logs: [],
    done: false,
    leads: [],
    abortController: new AbortController(),
  }
  leadRunStore.set(id, run)
  return run
}

export function getLeadRun(id: string): LeadRun | undefined {
  return leadRunStore.get(id)
}

export function addLeadLog(id: string, log: Omit<AgentLog, "timestamp">): void {
  const run = leadRunStore.get(id)
  if (run) {
    run.logs.push({ ...log, timestamp: new Date() })
  }
}

export function completeLeadRun(id: string, leads: LeadRun["leads"]): void {
  const run = leadRunStore.get(id)
  if (run) {
    run.done = true
    run.leads = leads
  }
}

// Form run store functions
export function createFormRun(id: string): FormRun {
  const run: FormRun = {
    id,
    logs: [],
    done: false,
    abortController: new AbortController(),
  }
  formRunStore.set(id, run)
  return run
}

export function getFormRun(id: string): FormRun | undefined {
  return formRunStore.get(id)
}

export function addFormLog(id: string, log: Omit<AgentLog, "timestamp">): void {
  const run = formRunStore.get(id)
  if (run) {
    run.logs.push({ ...log, timestamp: new Date() })
  }
}

export function completeFormRun(id: string, result: FormRun["result"]): void {
  const run = formRunStore.get(id)
  if (run) {
    run.done = true
    run.result = result
  }
}

// Cleanup old runs (call periodically)
export function cleanupOldRuns(maxAgeMs: number = 3600000): void {
  const now = Date.now()
  
  for (const [id, run] of agentRunStore) {
    if (run.done && run.completedAt && now - run.completedAt.getTime() > maxAgeMs) {
      agentRunStore.delete(id)
    }
  }
}

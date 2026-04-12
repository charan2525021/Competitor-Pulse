"use client"

import type { 
  AnalysisResult, 
  Lead, 
  FormSubmission, 
  IntelRecord, 
  HistoryEntry, 
  UserSettings 
} from "./types"

const API_BASE = "/api"

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || "Request failed")
  }

  return response.json()
}

// Analysis API
export const analysisAPI = {
  analyze: async (url: string): Promise<{ taskId: string }> => {
    return fetchAPI("/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
    })
  },

  getStatus: async (taskId: string): Promise<{ status: string; progress: number; result?: AnalysisResult }> => {
    return fetchAPI(`/analyze?taskId=${taskId}`)
  },

  getLatest: async (): Promise<AnalysisResult | null> => {
    return fetchAPI("/analyze?latest=true")
  },
}

// Leads API
export const leadsAPI = {
  search: async (params: {
    company?: string
    role?: string
    industry?: string
    location?: string
  }): Promise<{ leads: Lead[]; total: number }> => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value)
    })
    return fetchAPI(`/leads?${searchParams.toString()}`)
  },

  generate: async (leadId: string): Promise<{ email: string; confidence: number }> => {
    return fetchAPI("/leads", {
      method: "POST",
      body: JSON.stringify({ action: "generate_email", leadId }),
    })
  },

  export: async (leadIds: string[]): Promise<{ csv: string }> => {
    return fetchAPI("/leads", {
      method: "POST",
      body: JSON.stringify({ action: "export", leadIds }),
    })
  },
}

// Forms API
export const formsAPI = {
  detect: async (url: string): Promise<{ fields: Array<{ name: string; type: string; label: string; required: boolean }> }> => {
    return fetchAPI("/forms", {
      method: "POST",
      body: JSON.stringify({ action: "detect", url }),
    })
  },

  submit: async (url: string, data: Record<string, string>): Promise<FormSubmission> => {
    return fetchAPI("/forms", {
      method: "POST",
      body: JSON.stringify({ action: "submit", url, data }),
    })
  },

  getHistory: async (): Promise<{ submissions: FormSubmission[] }> => {
    return fetchAPI("/forms")
  },
}

// Intel API
export const intelAPI = {
  getAll: async (params?: {
    type?: string
    source?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ records: IntelRecord[]; total: number; pages: number }> => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    return fetchAPI(`/intel?${searchParams.toString()}`)
  },

  getById: async (id: string): Promise<IntelRecord> => {
    return fetchAPI(`/intel?id=${id}`)
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI("/intel", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    })
  },
}

// History API
export const historyAPI = {
  getAll: async (params?: {
    type?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ entries: HistoryEntry[]; total: number; stats: { total: number; successful: number; failed: number } }> => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    return fetchAPI(`/history?${searchParams.toString()}`)
  },

  getById: async (id: string): Promise<HistoryEntry> => {
    return fetchAPI(`/history?id=${id}`)
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI("/history", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    })
  },

  clear: async (): Promise<{ success: boolean }> => {
    return fetchAPI("/history", {
      method: "DELETE",
      body: JSON.stringify({ clearAll: true }),
    })
  },
}

// Settings API
export const settingsAPI = {
  get: async (): Promise<UserSettings> => {
    return fetchAPI("/settings")
  },

  update: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    return fetchAPI("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    })
  },
}

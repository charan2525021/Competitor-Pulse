import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = "http://localhost:3001/api/store"

interface HistoryItem {
  id: string
  type: "analysis" | "lead" | "form" | "intel"
  action: string
  target: string
  timestamp: string
  status: "success" | "failed" | "pending"
  details?: string
}

async function fetchCollection(name: string): Promise<any[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/${name}`, { cache: "no-store" })
    const data = await res.json()
    return data.success ? (data.data || []) : []
  } catch {
    return []
  }
}

function normalizeHistory(raw: any[]): HistoryItem[] {
  return raw.filter(r => r && r.id).map(r => ({
    id: r.id,
    type: r.type || "analysis" as const,
    action: r.action || "Activity",
    target: r.target || r.prompt || "",
    timestamp: r.timestamp || r.createdAt || new Date().toISOString(),
    status: r.status === "complete" || r.status === "success" || r.status === "done" ? "success"
      : r.status === "error" || r.status === "failed" ? "failed"
      : "pending",
    details: r.details || "",
  }))
}

function normalizeAgentHistory(raw: any[]): HistoryItem[] {
  return raw.filter(r => r && r.id).map(r => ({
    id: r.id,
    type: "analysis" as const,
    action: "Competitor Analysis",
    target: r.prompt || r.target || "Agent Run",
    timestamp: r.timestamp || new Date().toISOString(),
    status: r.status === "complete" || r.status === "success" || r.status === "done" ? "success"
      : r.status === "error" || r.status === "failed" ? "failed"
      : "pending",
    details: r.competitorsCount != null
      ? `Analyzed ${r.competitorsCount} competitor${r.competitorsCount !== 1 ? "s" : ""}`
      : (r.details || ""),
  }))
}

function normalizeLeadgenHistory(raw: any[]): HistoryItem[] {
  return raw.filter(r => r && r.id).map(r => ({
    id: r.id,
    type: "lead" as const,
    action: "Lead Generation",
    target: r.query || r.target || "Lead Search",
    timestamp: r.timestamp || new Date().toISOString(),
    status: r.status === "complete" || r.status === "success" || r.status === "done" ? "success"
      : r.status === "error" || r.status === "failed" ? "failed"
      : "pending",
    details: r.leadsCount != null ? `Found ${r.leadsCount} leads` : (r.details || ""),
  }))
}

function normalizeFormHistory(raw: any[]): HistoryItem[] {
  return raw.filter(r => r && r.id).map(r => ({
    id: r.id,
    type: "form" as const,
    action: r.formType ? `Form Fill — ${r.formType}` : "Form Submission",
    target: r.companyName || r.company || r.url || r.target || "Form",
    timestamp: r.timestamp || new Date().toISOString(),
    status: r.status === "complete" || r.status === "success" ? "success"
      : r.status === "error" || r.status === "failed" ? "failed"
      : "pending",
    details: r.details || "",
  }))
}

function normalizeStrategyHistory(raw: any[]): HistoryItem[] {
  const toolLabels: Record<string, string> = {
    market: "Market Breakdown",
    distribution: "Distribution Plan",
    weakness: "Competitor Weakness Map",
  }
  return raw.filter(r => r && r.id).map(r => ({
    id: r.id,
    type: "intel" as const,
    action: toolLabels[r.tool] || r.tool || "Strategy Analysis",
    target: r.input || r.target || "",
    timestamp: r.timestamp || new Date().toISOString(),
    status: r.status === "complete" || r.status === "success" || r.status === "done" ? "success"
      : r.status === "error" || r.status === "failed" ? "failed"
      : "pending",
    details: r.details || "",
  }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Fetch all history collections from the Express backend store
    const [history, agentHistory, leadgenHistory, formHistory, fillHistory, strategyHistory] = await Promise.all([
      fetchCollection("history"),
      fetchCollection("agentHistory"),
      fetchCollection("leadgenHistory"),
      fetchCollection("formHistory"),
      fetchCollection("fillHistory"),
      fetchCollection("strategyHistory"),
    ])

    // Normalize all into HistoryItem format
    let results: HistoryItem[] = [
      ...normalizeHistory(history),
      ...normalizeAgentHistory(agentHistory),
      ...normalizeLeadgenHistory(leadgenHistory),
      ...normalizeFormHistory(formHistory),
      ...normalizeFormHistory(fillHistory),
      ...normalizeStrategyHistory(strategyHistory),
    ]

    // Deduplicate by id
    const seen = new Set<string>()
    results = results.filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })

    // Filter by type
    if (type && type !== "all") {
      results = results.filter(r => r.type === type)
    }

    // Filter by status
    if (status && status !== "all") {
      results = results.filter(r => r.status === status)
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Calculate stats before slicing
    const allResults = results
    const stats = {
      total: allResults.length,
      success: allResults.filter(h => h.status === "success").length,
      failed: allResults.filter(h => h.status === "failed").length,
      byType: {
        analysis: allResults.filter(h => h.type === "analysis").length,
        lead: allResults.filter(h => h.type === "lead").length,
        form: allResults.filter(h => h.type === "form").length,
        intel: allResults.filter(h => h.type === "intel").length
      }
    }

    // Apply limit
    results = results.slice(0, limit)

    return NextResponse.json({
      items: results,
      total: results.length,
      stats,
      filters: { type, status }
    })
  } catch (error) {
    console.error("History fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, action, target, status, details } = body

    if (!type || !action || !target) {
      return NextResponse.json(
        { error: "Missing required fields: type, action, target" },
        { status: 400 }
      )
    }

    const newItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      type,
      action,
      target,
      timestamp: new Date().toISOString(),
      status: status || "success",
      details
    }

    // Determine backend collection based on type
    const collectionMap: Record<string, string> = {
      lead: "leadgenHistory",
      form: "fillHistory",
      intel: "strategyHistory",
      analysis: "history",
    }
    const collection = collectionMap[type] || "history"

    // Fetch existing data, prepend new item, save back
    try {
      const existing = await fetchCollection(collection)
      const updated = [newItem, ...existing]
      await fetch(`${BACKEND_URL}/${collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updated }),
      })
    } catch (e) {
      console.warn("Failed to persist history to backend:", e)
    }

    return NextResponse.json({
      item: newItem,
      message: "History item created successfully"
    })
  } catch (error) {
    console.error("History creation error:", error)
    return NextResponse.json(
      { error: "Failed to create history item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clearAll = searchParams.get("clearAll")

    if (clearAll === "true") {
      // Clear all history collections in the backend
      const collections = ["history", "agentHistory", "leadgenHistory", "formHistory", "fillHistory", "strategyHistory"]
      await Promise.all(
        collections.map(col =>
          fetch(`${BACKEND_URL}/${col}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: [] }),
          }).catch(() => {})
        )
      )
      return NextResponse.json({
        message: "History cleared successfully"
      })
    }

    return NextResponse.json(
      { error: "Use clearAll=true to clear history" },
      { status: 400 }
    )
  } catch (error) {
    console.error("History clear error:", error)
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    )
  }
}

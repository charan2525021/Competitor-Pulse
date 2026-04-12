import { NextRequest, NextResponse } from "next/server"

interface HistoryItem {
  id: string
  type: "analysis" | "lead" | "form" | "intel"
  action: string
  target: string
  timestamp: string
  status: "success" | "failed" | "pending"
  details?: string
}

// Mock history data
const mockHistory: HistoryItem[] = [
  {
    id: "hist-1",
    type: "analysis",
    action: "Competitor Analysis",
    target: "acme.com",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "success",
    details: "Extracted pricing, jobs, and reviews data"
  },
  {
    id: "hist-2",
    type: "lead",
    action: "Lead Generation",
    target: "VP Sales at SaaS companies",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "success",
    details: "Found 12 qualified leads"
  },
  {
    id: "hist-3",
    type: "form",
    action: "Form Submission",
    target: "techflow.com - Demo Request",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: "success",
    details: "Demo request submitted successfully"
  },
  {
    id: "hist-4",
    type: "analysis",
    action: "Competitor Analysis",
    target: "competitor.io",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: "failed",
    details: "Website blocked automated access"
  },
  {
    id: "hist-5",
    type: "intel",
    action: "Intel Collection",
    target: "Pricing changes across 5 competitors",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "success",
    details: "Collected 8 new intel records"
  },
  {
    id: "hist-6",
    type: "form",
    action: "Form Detection",
    target: "startup.com",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    status: "success",
    details: "Detected 3 forms on target website"
  },
  {
    id: "hist-7",
    type: "lead",
    action: "Lead Export",
    target: "Marketing Directors batch",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    status: "success",
    details: "Exported 25 leads to CSV"
  },
  {
    id: "hist-8",
    type: "analysis",
    action: "Bulk Analysis",
    target: "5 competitor websites",
    timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    status: "success",
    details: "Analyzed pricing and job data for all targets"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    let results = [...mockHistory]

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

    // Apply limit
    results = results.slice(0, limit)

    // Calculate stats
    const stats = {
      total: mockHistory.length,
      success: mockHistory.filter(h => h.status === "success").length,
      failed: mockHistory.filter(h => h.status === "failed").length,
      byType: {
        analysis: mockHistory.filter(h => h.type === "analysis").length,
        lead: mockHistory.filter(h => h.type === "lead").length,
        form: mockHistory.filter(h => h.type === "form").length,
        intel: mockHistory.filter(h => h.type === "intel").length
      }
    }

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

    mockHistory.unshift(newItem)

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
      mockHistory.length = 0
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

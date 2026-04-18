import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = "http://localhost:3001/api/store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const company = searchParams.get("company")
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "50")

    const res = await fetch(`${BACKEND_URL}/intel`, { cache: "no-store" })
    const json = await res.json()
    let results: any[] = json.success ? (json.data || []) : []

    // Filter by type
    if (type && type !== "all") {
      results = results.filter(r => r.type === type)
    }

    // Filter by company
    if (company) {
      const companyLower = company.toLowerCase()
      results = results.filter(r =>
        (r.company || "").toLowerCase().includes(companyLower)
      )
    }

    // Search in title and content
    if (search) {
      const searchLower = search.toLowerCase()
      results = results.filter(r =>
        (r.title || "").toLowerCase().includes(searchLower) ||
        (r.content || "").toLowerCase().includes(searchLower) ||
        (r.tags || []).some((t: string) => t.toLowerCase().includes(searchLower))
      )
    }

    // Sort by date (newest first)
    results.sort((a, b) =>
      new Date(b.collectedAt || b.timestamp || 0).getTime() - new Date(a.collectedAt || a.timestamp || 0).getTime()
    )

    // Apply limit
    results = results.slice(0, limit)

    return NextResponse.json({
      records: results,
      total: results.length,
      filters: { type, company, search }
    })
  } catch (error) {
    console.error("Intel fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch intel records" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, company, title, content, source, tags } = body

    if (!type || !company || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: type, company, title, content" },
        { status: 400 }
      )
    }

    const newRecord = {
      id: `intel-${Date.now()}`,
      type,
      company,
      title,
      content,
      source: source || "Manual Entry",
      collectedAt: new Date().toISOString(),
      tags: tags || []
    }

    // Save to backend store
    const res = await fetch(`${BACKEND_URL}/intel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecord),
    })
    const json = await res.json()

    if (!json.success) {
      return NextResponse.json({ error: "Failed to save intel record" }, { status: 500 })
    }

    return NextResponse.json({
      record: newRecord,
      message: "Intel record created successfully"
    })
  } catch (error) {
    console.error("Intel creation error:", error)
    return NextResponse.json(
      { error: "Failed to create intel record" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"

interface IntelRecord {
  id: string
  type: "pricing" | "job" | "review" | "news" | "social"
  company: string
  title: string
  content: string
  source: string
  collectedAt: string
  tags: string[]
}

// Mock intel database
const mockIntelDatabase: IntelRecord[] = [
  {
    id: "intel-1",
    type: "pricing",
    company: "Acme Corp",
    title: "Pricing Page Update Detected",
    content: "Enterprise tier increased from $299 to $349/month. New 'Startup' tier added at $49/month.",
    source: "acme.com/pricing",
    collectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ["pricing-change", "enterprise", "new-tier"]
  },
  {
    id: "intel-2",
    type: "job",
    company: "TechFlow",
    title: "Hiring Surge in AI/ML",
    content: "12 new ML engineering positions posted in the last week. Signals major product investment in AI capabilities.",
    source: "techflow.com/careers",
    collectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tags: ["hiring", "ai", "engineering"]
  },
  {
    id: "intel-3",
    type: "review",
    company: "DataSync",
    title: "Negative Review Spike on G2",
    content: "15 negative reviews in past month citing 'poor customer support' and 'frequent downtime'. Average rating dropped from 4.5 to 4.1.",
    source: "g2.com/datasync",
    collectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    tags: ["reviews", "support-issues", "opportunity"]
  },
  {
    id: "intel-4",
    type: "news",
    company: "CloudNine",
    title: "Series C Funding Announced",
    content: "CloudNine raises $85M Series C led by Sequoia. Plans to expand into APAC market and double engineering team.",
    source: "techcrunch.com",
    collectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    tags: ["funding", "expansion", "growth"]
  },
  {
    id: "intel-5",
    type: "social",
    company: "InnovateTech",
    title: "CEO LinkedIn Post - Product Tease",
    content: "CEO shared cryptic post about 'revolutionizing workflow automation' - likely new product launch coming Q2.",
    source: "linkedin.com",
    collectedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    tags: ["social", "product-launch", "automation"]
  },
  {
    id: "intel-6",
    type: "pricing",
    company: "ScaleUp",
    title: "Free Tier Removed",
    content: "ScaleUp removed their free tier, now minimum plan starts at $19/month. Community backlash on Twitter.",
    source: "scaleup.io/pricing",
    collectedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    tags: ["pricing-change", "free-tier", "controversy"]
  },
  {
    id: "intel-7",
    type: "job",
    company: "GrowthLabs",
    title: "Sales Team Restructuring",
    content: "Multiple senior sales positions posted. Former VP Sales departed according to LinkedIn. Possible sales strategy pivot.",
    source: "linkedin.com/jobs",
    collectedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    tags: ["hiring", "sales", "leadership-change"]
  },
  {
    id: "intel-8",
    type: "review",
    company: "Acme Corp",
    title: "Enterprise Customer Testimonial",
    content: "Fortune 500 case study published showcasing 40% efficiency gains. Strong enterprise positioning.",
    source: "acme.com/customers",
    collectedAt: new Date(Date.now() - 144 * 60 * 60 * 1000).toISOString(),
    tags: ["case-study", "enterprise", "social-proof"]
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const company = searchParams.get("company")
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "50")

    let results = [...mockIntelDatabase]

    // Filter by type
    if (type && type !== "all") {
      results = results.filter(r => r.type === type)
    }

    // Filter by company
    if (company) {
      results = results.filter(r => 
        r.company.toLowerCase().includes(company.toLowerCase())
      )
    }

    // Search in title and content
    if (search) {
      const searchLower = search.toLowerCase()
      results = results.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.content.toLowerCase().includes(searchLower) ||
        r.tags.some(t => t.toLowerCase().includes(searchLower))
      )
    }

    // Sort by date (newest first)
    results.sort((a, b) => 
      new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
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

    const newRecord: IntelRecord = {
      id: `intel-${Date.now()}`,
      type,
      company,
      title,
      content,
      source: source || "Manual Entry",
      collectedAt: new Date().toISOString(),
      tags: tags || []
    }

    // In a real app, this would save to database
    mockIntelDatabase.unshift(newRecord)

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

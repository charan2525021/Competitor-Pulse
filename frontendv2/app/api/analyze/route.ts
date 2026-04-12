import { NextRequest, NextResponse } from "next/server"

// Mock analysis data generator
function generateMockAnalysis(url: string) {
  const domain = new URL(url).hostname.replace("www.", "")
  
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url,
    domain,
    timestamp: new Date().toISOString(),
    status: "completed" as const,
    pricing: {
      tiers: [
        {
          name: "Starter",
          price: "$29/mo",
          features: ["5 users", "Basic analytics", "Email support"]
        },
        {
          name: "Professional",
          price: "$99/mo",
          features: ["25 users", "Advanced analytics", "Priority support", "API access"]
        },
        {
          name: "Enterprise",
          price: "Custom",
          features: ["Unlimited users", "Custom integrations", "Dedicated CSM", "SLA guarantee"]
        }
      ],
      comparison: "Pricing is 15-20% above market average with limited differentiation in mid-tier."
    },
    jobs: {
      totalOpenings: 47,
      departments: [
        { name: "Engineering", count: 18, trend: "up" as const },
        { name: "Sales", count: 12, trend: "up" as const },
        { name: "Marketing", count: 8, trend: "stable" as const },
        { name: "Product", count: 6, trend: "up" as const },
        { name: "Support", count: 3, trend: "down" as const }
      ],
      recentPostings: [
        { title: "Senior ML Engineer", location: "Remote", date: "2 days ago" },
        { title: "Enterprise AE", location: "New York", date: "3 days ago" },
        { title: "Product Manager - AI", location: "San Francisco", date: "1 week ago" }
      ]
    },
    reviews: {
      averageRating: 4.2,
      totalReviews: 1847,
      platforms: [
        { name: "G2", rating: 4.3, count: 892 },
        { name: "Capterra", rating: 4.1, count: 654 },
        { name: "TrustRadius", rating: 4.0, count: 301 }
      ],
      topComplaints: [
        "Slow customer support response",
        "Complex onboarding process",
        "Limited integrations"
      ],
      topPraises: [
        "Powerful analytics features",
        "Intuitive dashboard",
        "Regular feature updates"
      ]
    },
    insights: [
      "Competitor is aggressively hiring ML/AI talent - expect product pivot within 6 months",
      "Customer churn driven by support issues - opportunity to differentiate on service",
      "Mid-market segment underserved by current pricing structure",
      "Integration gaps with modern tools (Notion, Linear) create switching opportunities"
    ]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const analysis = generateMockAnalysis(url)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Failed to analyze URL" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to analyze a URL" })
}

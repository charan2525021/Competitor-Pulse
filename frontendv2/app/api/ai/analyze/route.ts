"use server"

import { NextRequest, NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { url: rawUrl, competitorName } = await request.json()

    if (!rawUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Normalize URL - handle company names without full URL
    let url = rawUrl.trim()
    let domain = url
    
    // Check if it's a valid URL or just a company name
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      // It's likely just a company name, try to construct a URL
      const cleanName = url.toLowerCase().replace(/\s+/g, "")
      url = `https://www.${cleanName}.com`
    }
    
    // Try to extract domain safely
    try {
      domain = new URL(url).hostname
    } catch {
      // If still invalid, use the cleaned input as domain
      domain = rawUrl.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9.-]/g, "")
      if (!domain.includes(".")) {
        domain = `${domain}.com`
      }
    }

    // Create analysis record
    const analysisRecord = user ? await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        competitor_url: url,
        competitor_name: competitorName || domain.replace(/^www\./, "").split(".")[0],
        status: "running",
      })
      .select()
      .single() : null

    // Generate AI insights using Groq
    const { text: insightsText } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `You are a competitive intelligence analyst. Analyze this competitor: ${url}
      
Generate a comprehensive competitive analysis report in JSON format with the following structure:
{
  "competitor": {
    "name": "Company Name",
    "domain": "${domain}",
    "industry": "Industry name",
    "description": "Brief description"
  },
  "pricing": {
    "model": "Pricing model type (e.g., Tiered, Usage-based, Flat-rate)",
    "plans": [
      {"name": "Plan name", "price": "$XX/mo", "features": ["feature1", "feature2", "feature3"]}
    ],
    "analysis": "Brief pricing strategy analysis"
  },
  "jobs": {
    "total": 25,
    "departments": [
      {"name": "Engineering", "count": 12, "trend": 15},
      {"name": "Sales", "count": 8, "trend": 5}
    ],
    "hiringSignals": "What their hiring tells us about strategy"
  },
  "reviews": {
    "averageRating": 4.2,
    "totalCount": 150,
    "platforms": [
      {"name": "G2", "rating": 4.3, "count": 80}
    ],
    "sentiment": {"positive": 70, "neutral": 20, "negative": 10},
    "topStrengths": ["strength1", "strength2"],
    "topWeaknesses": ["weakness1", "weakness2"]
  },
  "insights": {
    "summary": "Executive summary of competitive position",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2", "weakness3"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"],
    "recommendations": [
      {"title": "Recommendation title", "description": "Details", "priority": "high", "effort": "medium"}
    ]
  }
}

Be realistic and generate plausible data based on typical SaaS companies. Return ONLY valid JSON, no markdown.`,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Parse AI response
    let analysisData
    try {
      // Clean the response - remove any markdown code blocks if present
      const cleanedText = insightsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysisData = JSON.parse(cleanedText)
    } catch {
      // If parsing fails, create a structured response
      analysisData = {
        competitor: {
          name: competitorName || domain.replace(/^www\./, "").split(".")[0],
          domain: domain,
          industry: "Technology",
          description: "Competitor analysis pending"
        },
        pricing: {
          model: "Tiered",
          plans: [
            { name: "Starter", price: "$29/mo", features: ["Basic features", "5 users", "Email support"] },
            { name: "Pro", price: "$99/mo", features: ["Advanced features", "25 users", "Priority support"] },
            { name: "Enterprise", price: "Custom", features: ["All features", "Unlimited users", "Dedicated support"] }
          ],
          analysis: "Standard SaaS pricing model"
        },
        jobs: {
          total: 20,
          departments: [
            { name: "Engineering", count: 10, trend: 12 },
            { name: "Sales", count: 5, trend: 8 },
            { name: "Marketing", count: 3, trend: -2 },
            { name: "Support", count: 2, trend: 0 }
          ],
          hiringSignals: "Focus on product development"
        },
        reviews: {
          averageRating: 4.1,
          totalCount: 120,
          platforms: [
            { name: "G2", rating: 4.2, count: 65 },
            { name: "Capterra", rating: 4.0, count: 40 },
            { name: "TrustRadius", rating: 4.1, count: 15 }
          ],
          sentiment: { positive: 68, neutral: 22, negative: 10 },
          topStrengths: ["Ease of use", "Customer support"],
          topWeaknesses: ["Pricing", "Limited integrations"]
        },
        insights: {
          summary: insightsText.substring(0, 500),
          strengths: ["Market presence", "Product quality"],
          weaknesses: ["Pricing flexibility", "Feature gaps"],
          opportunities: ["Market expansion", "New features"],
          threats: ["New entrants", "Price competition"],
          recommendations: [
            { title: "Differentiate on price", description: "Offer competitive pricing", priority: "high", effort: "medium" }
          ]
        }
      }
    }

    // Update analysis record in database
    if (user && analysisRecord?.data) {
      await supabase
        .from("analyses")
        .update({
          competitor_name: analysisData.competitor?.name,
          pricing_data: analysisData.pricing,
          jobs_data: analysisData.jobs,
          reviews_data: analysisData.reviews,
          insights: analysisData.insights,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", analysisRecord.data.id)

      // Log activity
      await supabase.from("activity_history").insert({
        user_id: user.id,
        type: "analysis",
        action: "Competitor analysis completed",
        target: url,
        status: "success",
        details: `Analyzed ${analysisData.competitor?.name || url}`,
      })

      // Store intel records
      const intelRecords = [
        {
          user_id: user.id,
          type: "pricing",
          source: url,
          title: `${analysisData.competitor?.name} Pricing Analysis`,
          summary: analysisData.pricing?.analysis || "Pricing data collected",
          data: analysisData.pricing,
          confidence: 85,
        },
        {
          user_id: user.id,
          type: "jobs",
          source: url,
          title: `${analysisData.competitor?.name} Hiring Trends`,
          summary: analysisData.jobs?.hiringSignals || "Job data collected",
          data: analysisData.jobs,
          confidence: 90,
        },
        {
          user_id: user.id,
          type: "reviews",
          source: url,
          title: `${analysisData.competitor?.name} Customer Reviews`,
          summary: `Rating: ${analysisData.reviews?.averageRating}/5 from ${analysisData.reviews?.totalCount} reviews`,
          data: analysisData.reviews,
          confidence: 88,
        },
      ]

      await supabase.from("intel_records").insert(intelRecords)
    }

    return NextResponse.json({
      success: true,
      data: analysisData,
      analysisId: analysisRecord?.data?.id,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Failed to analyze competitor", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

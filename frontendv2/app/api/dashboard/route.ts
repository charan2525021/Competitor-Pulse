import { NextResponse } from "next/server"
import { getCompletedAgentRuns, getAllAgentRuns } from "@/lib/services/run-store"
import { createClient } from "@/lib/supabase/server"

// GET /api/dashboard - Get aggregated stats
export async function GET() {
  try {
    // Get stats from in-memory runs
    const completedRuns = getCompletedAgentRuns()
    const allRuns = getAllAgentRuns()

    // Calculate stats from completed runs
    let totalCompetitors = 0
    let totalPricingPages = 0
    let totalJobs = 0
    let totalReviews = 0
    let totalBlogPosts = 0
    let totalFeatures = 0

    const scanBreakdown: Array<{
      id: string
      startedAt: Date
      completedAt?: Date
      competitors: number
      tasks: string[]
    }> = []

    for (const run of completedRuns) {
      const tasks: string[] = []
      
      for (const report of run.reports) {
        totalCompetitors++
        
        if (report.pricing) {
          totalPricingPages++
          tasks.push("pricing")
        }
        
        if (report.jobs) {
          totalJobs += report.jobs.total || 0
          tasks.push("jobs")
        }
        
        if (report.reviews) {
          totalReviews += report.reviews.totalCount || 0
          tasks.push("reviews")
        }
        
        if (report.blog) {
          totalBlogPosts += report.blog.postCount || 0
          tasks.push("blog")
        }
        
        if (report.features) {
          totalFeatures += report.features.categories?.length || 0
          tasks.push("features")
        }
      }

      scanBreakdown.push({
        id: run.id,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        competitors: run.reports.length,
        tasks: [...new Set(tasks)]
      })
    }

    // Try to get additional stats from database
    let dbStats = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get activity counts
        const { data: activities } = await supabase
          .from("activity_history")
          .select("type, status")
          .eq("user_id", user.id)

        const { data: leads } = await supabase
          .from("leads")
          .select("id")
          .eq("user_id", user.id)

        const { data: analyses } = await supabase
          .from("analyses")
          .select("id, status")
          .eq("user_id", user.id)

        const { data: formSubmissions } = await supabase
          .from("form_submissions")
          .select("id, status")
          .eq("user_id", user.id)

        dbStats = {
          totalLeads: leads?.length || 0,
          totalAnalyses: analyses?.length || 0,
          completedAnalyses: analyses?.filter(a => a.status === "completed").length || 0,
          totalFormSubmissions: formSubmissions?.length || 0,
          successfulFormSubmissions: formSubmissions?.filter(f => f.status === "success").length || 0,
          activityBreakdown: {
            analysis: activities?.filter(a => a.type === "analysis").length || 0,
            leadSearch: activities?.filter(a => a.type === "lead_search").length || 0,
            formSubmit: activities?.filter(a => a.type === "form_submit").length || 0,
            intelCollect: activities?.filter(a => a.type === "intel_collect").length || 0
          }
        }
      }
    } catch {
      // Database not available, continue with in-memory stats only
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalScans: completedRuns.length,
        activeScans: allRuns.filter(r => !r.done).length,
        totalCompetitors,
        totalPricingPages,
        totalJobs,
        totalReviews,
        totalBlogPosts,
        totalFeatures,
        ...dbStats
      },
      scanBreakdown,
      recentScans: scanBreakdown.slice(-10).reverse()
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

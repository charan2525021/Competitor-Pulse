import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Allowed collections
const ALLOWED_COLLECTIONS = [
  "history",
  "intel",
  "leads",
  "leadHistory",
  "fillHistory",
  "formProfiles"
]

// Map collection names to Supabase tables
const COLLECTION_TABLE_MAP: Record<string, string> = {
  history: "activity_history",
  intel: "intel_records",
  leads: "leads",
  leadHistory: "activity_history",
  fillHistory: "form_submissions",
  formProfiles: "user_settings"
}

// POST /api/store - Store data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { collection, data, id } = body

    if (!collection || !ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json(
        { success: false, error: `Invalid collection. Allowed: ${ALLOWED_COLLECTIONS.join(", ")}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const table = COLLECTION_TABLE_MAP[collection]
    
    // Handle special cases
    if (collection === "formProfiles") {
      // Store in user_settings.profile
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          profile: data
        }, { onConflict: "user_id" })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // For intel records
    if (collection === "intel") {
      const { error } = await supabase
        .from("intel_records")
        .insert({
          user_id: user.id,
          type: data.type || "strategy",
          source: data.source || "unknown",
          title: data.title || "Intel Record",
          summary: data.summary,
          data: data,
          tags: data.tags || [],
          confidence: data.confidence || 0
        })

      if (error) throw error
      return NextResponse.json({ success: true, id })
    }

    // For activity history
    if (collection === "history" || collection === "leadHistory") {
      const { error } = await supabase
        .from("activity_history")
        .insert({
          user_id: user.id,
          type: data.type || "analysis",
          action: data.action || "unknown",
          target: data.target,
          status: data.status || "success",
          details: data.details
        })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Store error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET /api/store - Get stored data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get("collection")

    if (!collection || !ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json(
        { success: false, error: `Invalid collection. Allowed: ${ALLOWED_COLLECTIONS.join(", ")}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: true, data: [] })
    }

    const table = COLLECTION_TABLE_MAP[collection]

    // Handle special cases
    if (collection === "formProfiles") {
      const { data, error } = await supabase
        .from("user_settings")
        .select("profile")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") throw error
      return NextResponse.json({ success: true, data: data?.profile || {} })
    }

    // For intel records
    if (collection === "intel") {
      const { data, error } = await supabase
        .from("intel_records")
        .select("*")
        .eq("user_id", user.id)
        .order("collected_at", { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    // For activity history
    if (collection === "history") {
      const { data, error } = await supabase
        .from("activity_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    // For leads
    if (collection === "leads") {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    // For form submissions
    if (collection === "fillHistory") {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    console.error("Store get error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// DELETE /api/store - Delete data (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check for admin role
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const collection = searchParams.get("collection")
    const id = searchParams.get("id")

    if (!collection || !ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json(
        { success: false, error: "Invalid collection" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID required for deletion" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const table = COLLECTION_TABLE_MAP[collection]

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Store delete error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

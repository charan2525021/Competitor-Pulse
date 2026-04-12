import { NextRequest, NextResponse } from "next/server"

interface Settings {
  theme: "light" | "dark"
  notifications: boolean
  autoAnalyze: boolean
  dataRetention: number
  defaultProfile: UserProfile
}

interface UserProfile {
  firstName: string
  lastName: string
  email: string
  company: string
  jobTitle: string
}

// Default settings
let currentSettings: Settings = {
  theme: "dark",
  notifications: true,
  autoAnalyze: false,
  dataRetention: 30,
  defaultProfile: {
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex.morgan@company.com",
    company: "Your Company",
    jobTitle: "Product Manager"
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      settings: currentSettings
    })
  } catch (error) {
    console.error("Settings fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Merge with current settings
    currentSettings = {
      ...currentSettings,
      ...body,
      defaultProfile: {
        ...currentSettings.defaultProfile,
        ...(body.defaultProfile || {})
      }
    }

    return NextResponse.json({
      settings: currentSettings,
      message: "Settings updated successfully"
    })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Same as PUT for convenience
  return PUT(request)
}

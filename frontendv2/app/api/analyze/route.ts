import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = "http://localhost:3001/api"

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

    // Proxy to the backend agent endpoint
    const res = await fetch(`${BACKEND_URL}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: url }),
    })

    const data = await res.json()
    return NextResponse.json(data)
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

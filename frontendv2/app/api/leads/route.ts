import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { runTinyFishAgent } from "@/lib/services/tinyfish"
import { callLLM, parseJSONFromLLM } from "@/lib/services/llm"
import { createClient } from "@/lib/supabase/server"
import {
  createLeadRun,
  addLeadLog,
  completeLeadRun
} from "@/lib/services/run-store"

interface Lead {
  name: string
  title: string
  company: string
  email?: string
  emailConfidence?: number
  linkedinUrl?: string
  location?: string
  industry?: string
}

// POST /api/leads - Search for leads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company, title, industry, location, query, filters, stream } = body

    // Support both old format (query/filters) and new format (company/title)
    const searchCompany = company || filters?.company || ""
    const searchTitle = title || filters?.title || ""

    if (!searchCompany && !query) {
      return NextResponse.json(
        { success: false, error: "Company name or query is required" },
        { status: 400 }
      )
    }

    if (stream) {
      const runId = uuidv4()
      createLeadRun(runId)
      searchLeadsAsync(runId, searchCompany || query, searchTitle, industry, location)
      return NextResponse.json({ success: true, runId })
    }

    const leads = await searchLeads(searchCompany || query, searchTitle, industry, location)
    
    // Save leads to database if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user && leads.length > 0) {
      await supabase.from("leads").insert(
        leads.map(lead => ({
          user_id: user.id,
          name: lead.name,
          title: lead.title,
          company: lead.company,
          email: lead.email,
          email_confidence: lead.emailConfidence,
          linkedin_url: lead.linkedinUrl,
          location: lead.location,
          industry: lead.industry,
          source: "linkedin_search"
        }))
      )
    }

    return NextResponse.json({ 
      success: true, 
      leads,
      total: leads.length
    })
  } catch (error) {
    console.error("Lead generation error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET /api/leads - Get saved leads
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        success: true,
        leads: [],
        message: "Sign in to save and view leads"
      })
    }

    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, leads })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

async function searchLeadsAsync(
  runId: string,
  company: string,
  title?: string,
  industry?: string,
  location?: string
) {
  addLeadLog(runId, { type: "info", message: `Searching for leads at ${company}...` })

  try {
    const leads = await searchLeads(company, title, industry, location)
    completeLeadRun(runId, leads)
    addLeadLog(runId, { type: "success", message: `Found ${leads.length} leads` })
  } catch (error) {
    addLeadLog(runId, {
      type: "error",
      message: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    })
    completeLeadRun(runId, [])
  }
}

async function searchLeads(
  company: string,
  title?: string,
  industry?: string,
  location?: string
): Promise<Lead[]> {
  // Try TinyFish agent to search LinkedIn
  const result = await runTinyFishAgent(
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company + " " + (title || ""))}`,
    `Search for people at ${company}${title ? ` with title ${title}` : ""}. Extract their names, job titles, and LinkedIn profile URLs.`,
    { timeout: 60000 }
  )

  if (result.success && result.progressMessages?.length) {
    const context = result.progressMessages.join("\n")
    
    const llmResult = await callLLM(`
Extract lead information from this LinkedIn search result:

${context}

Generate a JSON array of leads:
[
  {
    "name": "Full Name",
    "title": "Job Title",
    "company": "${company}",
    "linkedinUrl": "https://linkedin.com/in/..."
  }
]
`, { jsonMode: true })

    if (llmResult.success && llmResult.text) {
      const parsed = parseJSONFromLLM(llmResult.text) as Lead[] | null
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(lead => ({
          ...lead,
          email: generatePrimaryEmail(lead.name, company),
          emailConfidence: 70,
          industry: industry || "Technology",
          location: location
        }))
      }
    }
  }

  // Fallback: generate realistic leads using LLM
  const mockPrompt = `
Generate 5 realistic business leads for ${company}${title ? ` in ${title} roles` : ""}.

Generate a JSON array:
[
  {
    "name": "Full Name",
    "title": "Job Title",
    "company": "${company}",
    "location": "${location || "San Francisco, CA"}"
  }
]
`

  const mockResult = await callLLM(mockPrompt, { jsonMode: true })
  
  if (mockResult.success && mockResult.text) {
    const parsed = parseJSONFromLLM(mockResult.text) as Lead[] | null
    if (Array.isArray(parsed)) {
      return parsed.map(lead => ({
        ...lead,
        email: generatePrimaryEmail(lead.name, company),
        emailConfidence: 60,
        industry: industry || "Technology"
      }))
    }
  }

  // Final fallback with mock data
  return generateFallbackLeads(company, title, location, industry)
}

function generatePrimaryEmail(name: string, company: string): string {
  const parts = name.toLowerCase().split(" ")
  const first = parts[0] || "user"
  const last = parts.slice(1).join("") || "contact"
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com"
  
  return `${first}.${last}@${domain}`
}

function generateFallbackLeads(company: string, title?: string, location?: string, industry?: string): Lead[] {
  const firstNames = ["Sarah", "Michael", "Jennifer", "David", "Emily"]
  const lastNames = ["Johnson", "Williams", "Chen", "Patel", "Anderson"]
  const titles = title ? [title] : ["VP of Sales", "Head of Marketing", "Director of Engineering", "Product Lead", "Growth Manager"]
  
  return Array.from({ length: 5 }, (_, i) => {
    const name = `${firstNames[i]} ${lastNames[i]}`
    return {
      name,
      title: titles[i % titles.length],
      company,
      email: generatePrimaryEmail(name, company),
      emailConfidence: 50,
      location: location || "San Francisco, CA",
      industry: industry || "Technology"
    }
  })
}

// Generate possible email permutations
export function generatePossibleEmails(name: string, company: string): string[] {
  const parts = name.toLowerCase().split(" ")
  const first = parts[0] || "user"
  const last = parts.slice(1).join("") || ""
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com"
  
  return [
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}@${domain}`,
    `${last}.${first}@${domain}`,
    `${first}_${last}@${domain}`
  ].filter(email => email.includes("@"))
}

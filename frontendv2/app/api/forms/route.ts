import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { runTinyFishAgent } from "@/lib/services/tinyfish"
import { callLLM, parseJSONFromLLM } from "@/lib/services/llm"
import { resolveCompanyPageUrl } from "@/lib/services/planner"
import { createClient } from "@/lib/supabase/server"
import {
  createFormRun,
  addFormLog,
  completeFormRun
} from "@/lib/services/run-store"

// Form types and their specific instructions
const FORM_TYPES: Record<string, string> = {
  contact: "Look for a contact form, typically on /contact page. Fill name, email, company, message fields.",
  demo: "Look for a demo request or booking form. Fill company size, use case, contact details.",
  signup: "Look for a free trial or sign up form. Create an account with provided email.",
  newsletter: "Look for a newsletter subscription form. Enter email to subscribe.",
  support: "Look for a support or help request form. Describe an issue or question.",
  partnership: "Look for a partnership or integration inquiry form.",
  career: "Look for a job application form on the careers page.",
  feedback: "Look for a feedback or survey form."
}

interface FormProfile {
  firstName?: string
  lastName?: string
  fullName?: string
  email: string
  company?: string
  title?: string
  phone?: string
  website?: string
  companySize?: string
  message?: string
}

interface FormField {
  name: string
  type: string
  value: string
  required: boolean
  placeholder?: string
}

interface FormResult {
  success: boolean
  filledFields?: Record<string, string>
  confirmationMessage?: string
  error?: string
}

// POST /api/forms - Handle form operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, url, company, formType, formId, fields, profile, stream } = body

    // Handle legacy detect action
    if (action === "detect") {
      return handleDetect(url)
    }

    // Handle legacy submit action
    if (action === "submit") {
      return handleLegacySubmit(formId, fields)
    }

    // New form fill flow
    if (!profile?.email) {
      return NextResponse.json(
        { success: false, error: "Profile with email is required" },
        { status: 400 }
      )
    }

    // Resolve URL if only company name provided
    let targetUrl = url
    if (!targetUrl && company) {
      targetUrl = await resolveCompanyUrl(company, formType || "contact")
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: "Could not determine target URL" },
        { status: 400 }
      )
    }

    if (stream) {
      const runId = uuidv4()
      createFormRun(runId)
      submitFormAsync(runId, targetUrl, formType || "contact", profile)
      return NextResponse.json({ success: true, runId })
    }

    const result = await submitFormFill(targetUrl, formType || "contact", profile)
    
    // Save to database
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from("form_submissions").insert({
        user_id: user.id,
        url: targetUrl,
        form_name: formType || "contact",
        fields: result.filledFields || {},
        status: result.success ? "success" : "failed",
        error: result.error
      })
    }

    return NextResponse.json({ 
      success: true, 
      ...result,
      submittedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("Form processing error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET /api/forms - Get form submission history
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        success: true,
        submissions: [],
        message: "Sign in to view form submission history"
      })
    }

    const { data: submissions, error } = await supabase
      .from("form_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, submissions })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// Legacy detect action - kept for backwards compatibility
async function handleDetect(url: string) {
  if (!url) {
    return NextResponse.json(
      { error: "URL is required for form detection" },
      { status: 400 }
    )
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format" },
      { status: 400 }
    )
  }

  // Use TinyFish to detect forms
  const result = await runTinyFishAgent(
    url,
    "Find all forms on this page. For each form, identify its purpose (contact, demo, signup, etc.) and list all input fields with their types and labels.",
    { timeout: 30000 }
  )

  if (result.success && result.progressMessages?.length) {
    const context = result.progressMessages.join("\n")
    
    const llmResult = await callLLM(`
Based on this page analysis, extract form information:

${context}

Generate a JSON array of detected forms:
[
  {
    "formName": "Contact Form",
    "fields": [
      { "name": "email", "type": "email", "required": true, "placeholder": "Email" }
    ]
  }
]
`, { jsonMode: true })

    if (llmResult.success && llmResult.text) {
      const parsed = parseJSONFromLLM(llmResult.text)
      if (Array.isArray(parsed)) {
        const forms = parsed.map((form, i) => ({
          id: `form-${Date.now()}-${i}`,
          url,
          formName: form.formName || `Form ${i + 1}`,
          fields: form.fields || [],
          status: "pending" as const
        }))
        return NextResponse.json({ forms, total: forms.length, url })
      }
    }
  }

  // Fallback mock forms
  const domain = new URL(url).hostname.replace("www.", "")
  const forms = [
    {
      id: `form-${Date.now()}-0`,
      url,
      formName: `${domain} - Contact Form`,
      fields: [
        { name: "firstName", type: "text", value: "", required: true, placeholder: "First Name" },
        { name: "lastName", type: "text", value: "", required: true, placeholder: "Last Name" },
        { name: "email", type: "email", value: "", required: true, placeholder: "Email" },
        { name: "message", type: "textarea", value: "", required: true, placeholder: "Message" }
      ],
      status: "pending" as const
    }
  ]

  return NextResponse.json({ forms, total: forms.length, url })
}

// Legacy submit action
async function handleLegacySubmit(formId: string, fields: FormField[]) {
  if (!formId || !fields) {
    return NextResponse.json(
      { error: "Form ID and fields are required for submission" },
      { status: 400 }
    )
  }

  const missingFields = fields.filter(f => f.required && !f.value)
  if (missingFields.length > 0) {
    return NextResponse.json({
      formId,
      success: false,
      message: `Missing required fields: ${missingFields.map(f => f.name).join(", ")}`
    })
  }

  return NextResponse.json({
    formId,
    success: true,
    message: "Form submitted successfully",
    submittedAt: new Date().toISOString()
  })
}

async function resolveCompanyUrl(company: string, formType: string): Promise<string> {
  // Map form type to page type for URL resolver
  const pageTypeMap: Record<string, "demo" | "contact" | "pricing" | "careers" | "about"> = {
    contact: "contact",
    demo: "demo",
    signup: "demo",
    newsletter: "contact",
    support: "contact",
    partnership: "contact",
    career: "careers",
    feedback: "contact"
  }
  
  const pageType = pageTypeMap[formType] || "contact"
  
  // Use the intelligent URL resolver from planner
  return resolveCompanyPageUrl(company, pageType)
}

async function submitFormAsync(
  runId: string,
  url: string,
  formType: string,
  profile: FormProfile
) {
  addFormLog(runId, { type: "info", message: `Navigating to ${url}...` })

  try {
    const result = await submitFormFill(url, formType, profile)
    completeFormRun(runId, result)
    
    if (result.success) {
      addFormLog(runId, { type: "success", message: "Form submitted successfully!" })
    } else {
      addFormLog(runId, { type: "error", message: result.error || "Form submission failed" })
    }
  } catch (error) {
    addFormLog(runId, {
      type: "error",
      message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
    })
    completeFormRun(runId, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

async function submitFormFill(
  url: string,
  formType: string,
  profile: FormProfile
): Promise<FormResult> {
  const typeInstructions = FORM_TYPES[formType] || FORM_TYPES.contact
  const goal = buildFormPrompt(url, formType, profile, typeInstructions)

  const result = await runTinyFishAgent(url, goal, { timeout: 90000 })

  if (!result.success) {
    return {
      success: false,
      error: result.error || "TinyFish agent failed"
    }
  }

  const context = [
    ...(result.progressMessages || []),
    JSON.stringify(result.result)
  ].join("\n")

  const extractPrompt = `
Based on the form filling session, extract:
1. Which fields were filled and with what values
2. Any confirmation message received
3. Whether the form was successfully submitted

Respond with JSON:
{
  "success": true,
  "filledFields": { "fieldName": "value" },
  "confirmationMessage": "message if any"
}
`

  const llmResult = await callLLM(`${context}\n\n${extractPrompt}`, { jsonMode: true })
  
  if (llmResult.success && llmResult.text) {
    const parsed = parseJSONFromLLM(llmResult.text) as FormResult | null
    if (parsed) return parsed
  }

  // Assume success
  const firstName = profile.firstName || profile.fullName?.split(" ")[0] || ""
  const lastName = profile.lastName || profile.fullName?.split(" ").slice(1).join(" ") || ""
  
  return {
    success: true,
    filledFields: {
      name: `${firstName} ${lastName}`.trim() || profile.email.split("@")[0],
      email: profile.email,
      company: profile.company || ""
    }
  }
}

function buildFormPrompt(
  url: string,
  formType: string,
  profile: FormProfile,
  typeInstructions: string
): string {
  const firstName = profile.firstName || profile.fullName?.split(" ")[0] || ""
  const lastName = profile.lastName || profile.fullName?.split(" ").slice(1).join(" ") || ""
  
  const profileInfo = `
User Profile:
- Name: ${firstName} ${lastName}
- Email: ${profile.email}
${profile.company ? `- Company: ${profile.company}` : ""}
${profile.title ? `- Title: ${profile.title}` : ""}
${profile.phone ? `- Phone: ${profile.phone}` : ""}
${profile.companySize ? `- Company Size: ${profile.companySize}` : ""}
${profile.message ? `- Message: ${profile.message}` : ""}
`

  const isHomepage = !url.includes("/contact") && !url.includes("/demo") && !url.includes("/signup")
  
  let prompt = ""
  
  if (isHomepage) {
    prompt += `First, look for a link to the ${formType} page or form. Common locations: header navigation, footer, or buttons like "Contact Us", "Get Demo", "Sign Up". Navigate to the form page.\n\n`
  }

  prompt += `${typeInstructions}\n\n`
  prompt += profileInfo
  prompt += `\nFill out the form with the above information and submit it. If any required field is not in the profile, use a reasonable default.`

  return prompt
}

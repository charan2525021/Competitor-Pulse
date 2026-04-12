import { callLLM, parseJSONFromLLM } from "./llm"

// Known company URL mappings
const KNOWN_URLS: Record<string, string> = {
  "slack": "https://slack.com",
  "notion": "https://notion.so",
  "stripe": "https://stripe.com",
  "intercom": "https://intercom.com",
  "hubspot": "https://hubspot.com",
  "salesforce": "https://salesforce.com",
  "zendesk": "https://zendesk.com",
  "freshdesk": "https://freshdesk.com",
  "asana": "https://asana.com",
  "monday": "https://monday.com",
  "trello": "https://trello.com",
  "jira": "https://atlassian.com/software/jira",
  "linear": "https://linear.app",
  "figma": "https://figma.com",
  "canva": "https://canva.com",
  "miro": "https://miro.com",
  "airtable": "https://airtable.com",
  "coda": "https://coda.io",
  "clickup": "https://clickup.com",
  "basecamp": "https://basecamp.com",
  "zoom": "https://zoom.us",
  "loom": "https://loom.com",
  "calendly": "https://calendly.com",
  "typeform": "https://typeform.com",
  "surveymonkey": "https://surveymonkey.com",
  "mailchimp": "https://mailchimp.com",
  "sendgrid": "https://sendgrid.com",
  "twilio": "https://twilio.com",
  "segment": "https://segment.com",
  "amplitude": "https://amplitude.com",
  "mixpanel": "https://mixpanel.com",
  "hotjar": "https://hotjar.com",
  "fullstory": "https://fullstory.com",
  "datadog": "https://datadoghq.com",
  "newrelic": "https://newrelic.com",
  "pagerduty": "https://pagerduty.com",
  "opsgenie": "https://opsgenie.com",
  "github": "https://github.com",
  "gitlab": "https://gitlab.com",
  "bitbucket": "https://bitbucket.org",
  "vercel": "https://vercel.com",
  "netlify": "https://netlify.com",
  "heroku": "https://heroku.com",
  "aws": "https://aws.amazon.com",
  "gcp": "https://cloud.google.com",
  "azure": "https://azure.microsoft.com",
  "digitalocean": "https://digitalocean.com",
  "cloudflare": "https://cloudflare.com",
  "fastly": "https://fastly.com",
  "auth0": "https://auth0.com",
  "okta": "https://okta.com",
  "onelogin": "https://onelogin.com",
  "1password": "https://1password.com",
  "lastpass": "https://lastpass.com",
  "dropbox": "https://dropbox.com",
  "box": "https://box.com",
  "google drive": "https://drive.google.com",
  "onedrive": "https://onedrive.com",
  "shopify": "https://shopify.com",
  "bigcommerce": "https://bigcommerce.com",
  "woocommerce": "https://woocommerce.com",
  "squarespace": "https://squarespace.com",
  "wix": "https://wix.com",
  "webflow": "https://webflow.com",
  "wordpress": "https://wordpress.com",
  "ghost": "https://ghost.org",
  "medium": "https://medium.com",
  "substack": "https://substack.com",
  "convertkit": "https://convertkit.com",
  "klaviyo": "https://klaviyo.com",
  "braze": "https://braze.com",
  "iterable": "https://iterable.com",
  "customer.io": "https://customer.io",
  "drift": "https://drift.com",
  "crisp": "https://crisp.chat",
  "helpscout": "https://helpscout.com",
  "front": "https://front.com",
  "gorgias": "https://gorgias.com",
  "retool": "https://retool.com",
  "appsmith": "https://appsmith.com",
  "bubble": "https://bubble.io",
  "zapier": "https://zapier.com",
  "make": "https://make.com",
  "n8n": "https://n8n.io",
  "pipedream": "https://pipedream.com",
  "tray.io": "https://tray.io",
  "workato": "https://workato.com",
}

export interface IntelPlan {
  competitors: Array<{
    name: string
    url: string
  }>
  tasks: Array<"pricing" | "jobs" | "reviews" | "blog" | "features" | "social">
}

/**
 * Resolve a company name to its URL
 */
export function resolveUrl(company: string): string | null {
  const normalized = company.toLowerCase().trim()
  
  // Exact match
  if (KNOWN_URLS[normalized]) {
    return KNOWN_URLS[normalized]
  }
  
  // Partial match
  for (const [key, url] of Object.entries(KNOWN_URLS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url
    }
  }
  
  return null
}

/**
 * Generate an intelligence plan from natural language input
 */
export async function generatePlan(
  prompt: string,
  options: {
    maxCompetitors?: number
    taskFilter?: string[]
  } = {}
): Promise<IntelPlan> {
  const maxCompetitors = options.maxCompetitors || 5
  const defaultTasks: IntelPlan["tasks"] = ["pricing", "jobs", "reviews"]
  
  const taskFilterStr = options.taskFilter?.length 
    ? options.taskFilter.join(", ") 
    : "pricing, jobs, reviews, blog"

  const plannerPrompt = `You are a competitive intelligence planner. Given the user's request, identify competitor companies and plan what intelligence to gather.

User Request: "${prompt}"
Filters:
- Tasks to perform: ${taskFilterStr}
- Max competitors: ${maxCompetitors}

Return ONLY valid JSON (no markdown, no explanation):
{
  "competitors": [
    { "name": "Company Name", "url": "https://company.com" }
  ],
  "tasks": ["pricing", "jobs", "reviews", "blog"],
  "maxDepth": 3
}

CRITICAL RULES:
- competitors: array of objects with name and REAL homepage URL
- The "url" field MUST be the company's actual website URL, NOT a Google search URL
- Examples of CORRECT urls: "https://slack.com", "https://www.notion.so", "https://linear.app"
- Examples of WRONG urls: "https://www.google.com/search?q=..."
- NEVER use google.com URLs. Always use the company's own domain.
- If user gives company names, use those. If user gives an industry, pick top known competitors in that space.
- tasks must be from: pricing, jobs, reviews, blog, social, features
- Only include tasks from the filter list above
- maxDepth: how many pages deep to go per task (1-5)
- Return at most ${maxCompetitors} competitors`

  try {
    const result = await callLLM(plannerPrompt, { jsonMode: true })
    
    if (result.success && result.text) {
      const parsed = parseJSONFromLLM(result.text) as IntelPlan | null
      
      if (parsed?.competitors?.length) {
        // Resolve URLs for any companies that have known URLs
        parsed.competitors = parsed.competitors.map(comp => ({
          name: comp.name,
          url: resolveUrl(comp.name) || comp.url || `https://www.${comp.name.toLowerCase().replace(/\s+/g, "")}.com`
        }))
        
        return {
          competitors: parsed.competitors.slice(0, maxCompetitors),
          tasks: parsed.tasks?.length ? parsed.tasks : defaultTasks
        }
      }
    }
  } catch (error) {
    console.error("Plan generation failed:", error)
  }
  
  // Fallback: extract company names from input
  return getDefaultPlan(prompt, maxCompetitors)
}

/**
 * Resolve a company name to a specific page URL (demo, contact, pricing, etc.)
 */
export async function resolveCompanyPageUrl(
  company: string,
  pageType: "demo" | "contact" | "pricing" | "careers" | "about"
): Promise<string> {
  const urlResolverPrompt = `You are a URL resolver. Given a company name and the type of page needed, return the most likely URL.
Company: "${company}"
Page type needed: ${pageType === "demo" ? "demo request page, book a demo, schedule demo, request demo" : `${pageType} page`}
Rules:
- Return ONLY a single valid URL, nothing else
- Use https:// prefix
- If you know the company's actual domain, use it (e.g., Salesforce → https://www.salesforce.com/form/contact/contactme/)
- If unsure of exact path, return the company's homepage URL (e.g., https://www.companyname.com)
- For well-known companies, try to guess the specific page path
- Do NOT add any explanation, just the URL
URL:`

  try {
    const result = await callLLM(urlResolverPrompt, { maxTokens: 100 })
    
    if (result.success && result.text) {
      // Extract URL from response
      const urlMatch = result.text.trim().match(/https?:\/\/[^\s]+/)
      if (urlMatch) {
        return urlMatch[0].replace(/['"]+$/, "") // Remove trailing quotes
      }
    }
  } catch (error) {
    console.error("URL resolution failed:", error)
  }
  
  // Fallback: use known URL or construct default
  const knownUrl = resolveUrl(company)
  if (knownUrl) {
    const pageMap: Record<string, string> = {
      demo: "/demo",
      contact: "/contact",
      pricing: "/pricing",
      careers: "/careers",
      about: "/about",
    }
    return `${knownUrl}${pageMap[pageType] || ""}`
  }
  
  // Final fallback
  const cleanCompany = company.toLowerCase().replace(/\s+/g, "")
  return `https://www.${cleanCompany}.com`
}

/**
 * Extract a default plan from input text
 */
function getDefaultPlan(input: string, maxCompetitors: number): IntelPlan {
  const competitors: IntelPlan["competitors"] = []
  
  // Check for known companies in input
  for (const [company, url] of Object.entries(KNOWN_URLS)) {
    if (input.toLowerCase().includes(company)) {
      competitors.push({ name: company, url })
      if (competitors.length >= maxCompetitors) break
    }
  }
  
  // If no known companies found, try to extract words as company names
  if (competitors.length === 0) {
    const words = input.split(/\s+/).filter(w => 
      w.length > 3 && 
      !["analyze", "research", "find", "compare", "check", "look", "their", "with", "about"].includes(w.toLowerCase())
    )
    
    for (const word of words.slice(0, maxCompetitors)) {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "")
      if (cleanWord.length > 2) {
        competitors.push({
          name: cleanWord,
          url: `https://www.${cleanWord.toLowerCase()}.com`
        })
      }
    }
  }
  
  return {
    competitors,
    tasks: ["pricing", "jobs", "reviews"]
  }
}

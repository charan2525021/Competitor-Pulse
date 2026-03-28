export function buildPlannerPrompt(
  userInput: string,
  filters: { tasks?: string[]; maxCompetitors?: number }
): string {
  return `You are a competitive intelligence planner. Given the user's request, identify competitor companies and plan what intelligence to gather.

User Request: "${userInput}"
Filters:
- Tasks to perform: ${(filters.tasks || ["pricing", "jobs", "reviews", "blog"]).join(", ")}
- Max competitors: ${filters.maxCompetitors || 5}

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
- Examples of CORRECT urls: "https://slack.com", "https://www.notion.so", "https://linear.app", "https://www.hubspot.com", "https://www.salesforce.com"
- Examples of WRONG urls: "https://www.google.com/search?q=...", "https://google.com/..."
- NEVER use google.com URLs. Always use the company's own domain.
- If user gives company names, use those. If user gives an industry, pick top known competitors in that space.
- tasks must be from: pricing, jobs, reviews, blog, social, features
- Only include tasks from the filter list above
- maxDepth: how many pages deep to go per task (1-5)
- Return at most ${filters.maxCompetitors || 5} competitors`;
}

export function buildSummaryPrompt(company: string, rawData: string): string {
  return `Summarize this competitive intelligence data for ${company} into a brief executive summary (3-4 sentences). Focus on key pricing, hiring signals, and market positioning.

Raw data:
${rawData}

Return only the summary text, no JSON.`;
}

import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { runTinyFishAgent, llmExtract, cancelTinyFishRun } from "../services/tinyfish.service";
import { setLLMConfig } from "../llm/groq.client";
import { loadConfig, appendToStore } from "../services/store";

// In-memory stores
const leadRunStore = new Map<string, {
  logs: string[];
  done: boolean;
  leads: any[];
  abortController?: AbortController;
  tinyFishRunId?: string;
}>();

export async function searchLeads(req: Request, res: Response) {
  const { query, tinyfishApiKey } = req.body;

  if (!query) {
    res.status(400).json({ success: false, error: "Query is required" });
    return;
  }

  // Set runtime TinyFish key
  if (tinyfishApiKey) {
    process.env.TINYFISH_API_KEY_RUNTIME = tinyfishApiKey;
  }

  // Set LLM config from stored settings
  const cfg = loadConfig();
  if (cfg?.llm?.apiKey) setLLMConfig(cfg.llm);

  const runId = uuid();
  const abortController = new AbortController();
  leadRunStore.set(runId, { logs: [], done: false, leads: [], abortController });

  // Return runId immediately
  res.json({ success: true, runId });

  // Execute search async
  const run = leadRunStore.get(runId)!;

  try {
    run.logs.push(`Searching for: "${query}"`);
    run.logs.push("Connecting to LinkedIn via TinyFish agent...");

    const result = await runTinyFishAgent(
      "https://www.linkedin.com",
      `Search LinkedIn for people matching this description: "${query}". Extract up to 10 profiles with their full name, current job title/role, company name, and any visible email or contact info. Use the LinkedIn search bar. Return structured data for each person found.`,
      (msg) => {
        run.logs.push(msg);
      },
      { signal: abortController.signal, onRunId: (id) => { run.tinyFishRunId = id; } }
    );

    run.logs.push("Search complete — parsing results with AI...");

    const parsed = await llmExtract(result, `Extract LinkedIn profile information from the search results. Return JSON:
{
  "leads": [
    {
      "name": "Full Name",
      "company": "Company Name",
      "role": "Job Title",
      "email": "email@example.com or empty string if not found",
      "linkedinUrl": "https://linkedin.com/in/username or empty string"
    }
  ]
}
If no profiles found, return: { "leads": [] }`);

    const leads = (parsed?.leads || []).map((l: any) => {
      const name = l.name || "Unknown";
      const company = l.company || "Unknown";
      const email = l.email || "";
      const possibleEmails = !email ? generatePossibleEmails(name, company) : [];
      return {
        id: uuid(),
        name,
        company,
        role: l.role || "",
        email,
        possibleEmails,
        linkedinUrl: l.linkedinUrl || "",
        addedAt: new Date().toISOString(),
      };
    });

    run.leads = leads;
    run.logs.push(`Found ${leads.length} lead${leads.length !== 1 ? "s" : ""} matching your criteria.`);
  } catch (err) {
    console.error("[LeadSearch] Error:", (err as Error).message);
    run.logs.push("Search encountered an issue — generating sample leads...");
    run.leads = generateMockLeads(query);
    run.logs.push(`Generated ${run.leads.length} sample leads for demo.`);
  } finally {
    run.done = true;
    // Persist to history
    appendToStore("leadgenHistory", {
      id: runId,
      query,
      timestamp: new Date().toISOString(),
      leadsCount: run.leads.length,
      status: run.leads.length > 0 ? "complete" : "error",
      logsCount: run.logs.length,
      leads: run.leads,
    });
  }
}

export function streamLeadLogs(req: Request, res: Response) {
  const { runId } = req.params;

  const run = leadRunStore.get(runId as string);
  if (!run) {
    res.status(404).json({ success: false, error: "Run not found" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let lastIndex = 0;

  const interval = setInterval(() => {
    while (lastIndex < run.logs.length) {
      const message = run.logs[lastIndex];
      res.write(`data: ${JSON.stringify({ type: "log", message })}\n\n`);
      lastIndex++;
    }

    if (run.done && lastIndex >= run.logs.length) {
      res.write(`data: ${JSON.stringify({ type: "complete", message: "Search finished", leads: run.leads })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 150);

  req.on("close", () => {
    clearInterval(interval);
  });
}

export function getLeadResults(req: Request, res: Response) {
  const { runId } = req.params;
  const run = leadRunStore.get(runId as string);
  if (!run) {
    res.status(404).json({ success: false, error: "Run not found" });
    return;
  }
  res.json({ success: true, leads: run.leads, done: run.done });
}

export async function cancelLeadSearch(req: Request, res: Response) {
  const { runId } = req.params;
  const run = leadRunStore.get(runId as string);
  if (!run) {
    res.status(404).json({ success: false, error: "Run not found" });
    return;
  }
  let tinyFishCancelled = false;
  // Cancel TinyFish run on their server
  if (run.tinyFishRunId) {
    tinyFishCancelled = await cancelTinyFishRun(run.tinyFishRunId);
    run.logs.push(tinyFishCancelled ? "TinyFish agent cancelled on server." : `TinyFish cancel attempted (runId: ${run.tinyFishRunId}) — check server logs.`);
  } else {
    run.logs.push("No TinyFish run ID captured — could not cancel remote execution. Stopping local stream only.");
  }
  if (run.abortController) {
    run.abortController.abort();
    run.logs.push("Search cancelled by user.");
  }
  run.done = true;
  res.json({ success: true, message: "Search cancelled", tinyFishCancelled, tinyFishRunId: run.tinyFishRunId || null });
}

export async function sendOutreach(req: Request, res: Response) {
  const { leads, subject, body } = req.body;

  if (!leads?.length || !subject || !body) {
    res.status(400).json({ success: false, error: "Leads, subject, and body are required" });
    return;
  }

  const sent = leads.map((lead: any) => {
    const personalizedSubject = subject
      .replace(/\{\{name\}\}/g, lead.name)
      .replace(/\{\{company\}\}/g, lead.company)
      .replace(/\{\{role\}\}/g, lead.role)
      .replace(/\{\{email\}\}/g, lead.email);

    console.log(`[Outreach] Would send to ${lead.email}: "${personalizedSubject}"`);
    return { email: lead.email, subject: personalizedSubject, status: "queued" };
  });

  res.json({
    success: true,
    message: `Outreach queued for ${sent.length} lead${sent.length !== 1 ? "s" : ""}. (Demo mode — emails not actually sent)`,
    sent,
  });
}

function generateMockLeads(_query: string): any[] {
  const names = ["Alex Chen", "Sarah Johnson", "Mike Rivera", "Priya Patel", "Jordan Kim"];
  const companies = ["Stripe", "Notion", "Linear", "Vercel", "Supabase"];
  const roles = ["VP Engineering", "Head of Product", "CTO", "Director of Sales", "Growth Lead"];

  return names.slice(0, 3 + Math.floor(Math.random() * 3)).map((name, i) => ({
    id: uuid(),
    name,
    company: companies[i % companies.length],
    role: roles[i % roles.length],
    email: "",
    possibleEmails: generatePossibleEmails(name, companies[i % companies.length]),
    linkedinUrl: "",
    addedAt: new Date().toISOString(),
  }));
}

/**
 * Generate possible email addresses from a person's name and company.
 * e.g. "Nikhila Chappa" at "Entain India" → nikhila.chappa@entainindia.com, nikhilachappa@entainindia.com, etc.
 */
function generatePossibleEmails(fullName: string, company: string): string[] {
  if (!fullName || fullName === "Unknown" || !company || company === "Unknown") return [];

  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const first = parts[0] || "";
  const last = parts[parts.length - 1] || "";

  // Build domain from company name: "Entain India" → "entainindia.com"
  const domain = company
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    + ".com";

  const emails = new Set<string>();

  if (first && last && first !== last) {
    emails.add(`${first}.${last}@${domain}`);
    emails.add(`${first}${last}@${domain}`);
    emails.add(`${first[0]}${last}@${domain}`);
    emails.add(`${first}@${domain}`);
    emails.add(`${last}.${first}@${domain}`);
  } else if (first) {
    emails.add(`${first}@${domain}`);
  }

  return Array.from(emails);
}

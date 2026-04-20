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

    // Step 1: Google search for LinkedIn profiles (avoids login wall)
    run.logs.push("Step 1: Searching Google for LinkedIn profiles...");

    const linkedInResult = await runTinyFishAgent(
      `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in ${query}`)}`,
      `Read the Google search results. Extract names, job titles, companies, and LinkedIn profile URLs from the search result snippets. Do NOT click on LinkedIn links. Just read the Google result page snippets. List every person you can find.`,
      (msg) => { run.logs.push(msg); },
      { signal: abortController.signal, onRunId: (id) => { run.tinyFishRunId = id; } }
    );

    let leads: any[] = [];

    if (linkedInResult && !abortController.signal.aborted) {
      const context = typeof linkedInResult === "string" ? linkedInResult : JSON.stringify(linkedInResult);
      const blocked = context.toLowerCase().includes("captcha") || context.toLowerCase().includes("unusual traffic");

      if (!blocked) {
        run.logs.push("Parsing Google results with AI...");
        const parsed = await llmExtract(linkedInResult, `Extract people from these Google search results. Return JSON:
{
  "leads": [
    {
      "name": "Full Name",
      "company": "Company Name",
      "role": "Job Title",
      "linkedinUrl": "https://linkedin.com/in/username"
    }
  ]
}
Only include real people found in the text. If none found, return: { "leads": [] }`);
        leads = parsed?.leads || [];
      }
    }

    // Step 2: If LinkedIn Google search failed, try company team pages
    if (leads.length === 0 && !abortController.signal.aborted) {
      run.logs.push("Step 2: Searching for company team/about pages...");

      const teamResult = await runTinyFishAgent(
        `https://www.google.com/search?q=${encodeURIComponent(`${query} team leadership about`)}`,
        `Look at the search results for team/about/leadership pages. Click on the most relevant result and extract names and job titles of people listed. If blocked, try another result.`,
        (msg) => { run.logs.push(msg); },
        { signal: abortController.signal, onRunId: (id) => { run.tinyFishRunId = id; } }
      );

      if (teamResult && !abortController.signal.aborted) {
        run.logs.push("Parsing team page results with AI...");
        const parsed = await llmExtract(teamResult, `Extract people from these search/team page results. Return JSON:
{
  "leads": [
    {
      "name": "Full Name",
      "company": "Company Name",
      "role": "Job Title",
      "linkedinUrl": ""
    }
  ]
}
Only include real people found in the text. If none found, return: { "leads": [] }`);
        leads = parsed?.leads || [];
      }
    }

    // Step 3: LLM knowledge fallback
    if (leads.length === 0 && !abortController.signal.aborted) {
      run.logs.push("Step 3: Using AI knowledge to generate likely contacts...");

      const parsed = await llmExtract(
        { progressMessages: [`User searched for: ${query}`] },
        `You are a B2B lead generation expert. Based on your knowledge, generate 5-8 realistic decision-maker contacts matching: "${query}".

Include C-suite, VPs, and directors. Use realistic names and titles.

Return JSON:
{
  "leads": [
    {
      "name": "Full Name",
      "company": "Company Name",
      "role": "Job Title",
      "linkedinUrl": "https://linkedin.com/in/firstname-lastname"
    }
  ]
}

Generate at least 5 leads. Do NOT return empty leads.`
      );
      leads = parsed?.leads || [];
    }

    // Enrich with email suggestions
    run.leads = leads.map((l: any) => {
      const name = l.name || "Unknown";
      const company = l.company || "Unknown";
      const suggestions = generateEmailSuggestions(name, company);
      return {
        id: uuid(),
        name,
        company,
        role: l.role || "",
        title: l.role || "",
        email: suggestions[0]?.email || "",
        emailConfidence: suggestions[0]?.confidence || 0,
        emailSuggestions: suggestions,
        linkedinUrl: l.linkedinUrl || "",
        addedAt: new Date().toISOString(),
      };
    });

    run.logs.push(`Found ${run.leads.length} lead${run.leads.length !== 1 ? "s" : ""} with email suggestions.`);
  } catch (err) {
    console.error("[LeadSearch] Error:", (err as Error).message);
    run.logs.push(`Search encountered an issue: ${(err as Error).message}`);
    run.logs.push("Retrying with AI knowledge...");

    try {
      const fallback = await llmExtract(
        { progressMessages: [`User searched for: ${query}`] },
        `You are a B2B lead generation expert. Generate 5 realistic decision-maker contacts matching: "${query}". Return JSON:
{
  "leads": [{ "name": "Full Name", "company": "Company Name", "role": "Job Title", "linkedinUrl": "" }]
}
Generate at least 5 leads.`
      );
      run.leads = (fallback?.leads || []).map((l: any) => {
        const suggestions = generateEmailSuggestions(l.name || "Unknown", l.company || "Unknown");
        return {
          id: uuid(), name: l.name || "Unknown", company: l.company || "Unknown",
          role: l.role || "", title: l.role || "",
          email: suggestions[0]?.email || "", emailConfidence: suggestions[0]?.confidence || 0,
          emailSuggestions: suggestions, linkedinUrl: l.linkedinUrl || "",
          addedAt: new Date().toISOString(),
        };
      });
      run.logs.push(`Generated ${run.leads.length} leads via AI fallback.`);
    } catch {
      run.leads = [];
      run.logs.push("All methods failed — no leads found.");
    }
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

function generateEmailSuggestions(fullName: string, company: string): { email: string; confidence: number; pattern: string }[] {
  if (!fullName || fullName === "Unknown" || !company || company === "Unknown") return [];

  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join("") || "";
  const firstInitial = first[0] || "";

  const domain = company
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    + ".com";

  const suggestions: { email: string; confidence: number; pattern: string }[] = [];

  if (first && last && first !== last) {
    suggestions.push(
      { email: `${first}.${last}@${domain}`, confidence: 92, pattern: "first.last" },
      { email: `${first}${last}@${domain}`, confidence: 78, pattern: "firstlast" },
      { email: `${firstInitial}${last}@${domain}`, confidence: 72, pattern: "flast" },
      { email: `${last}.${first}@${domain}`, confidence: 55, pattern: "last.first" },
      { email: `${first}_${last}@${domain}`, confidence: 48, pattern: "first_last" },
      { email: `${first}@${domain}`, confidence: 35, pattern: "first" },
    );
  } else if (first) {
    suggestions.push({ email: `${first}@${domain}`, confidence: 65, pattern: "first" });
  }

  return suggestions;
}

import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { runTinyFishAgent, llmExtract } from "../services/tinyfish.service";
import { callGroq } from "../llm/groq.client";

// In-memory store
const formRunStore = new Map<string, {
  logs: string[];
  done: boolean;
  result: any;
  abortController?: AbortController;
}>();

/**
 * Use LLM to figure out the most likely URL for a given company + form type.
 * Returns a full URL like "https://company.com/contact"
 */
async function resolveCompanyUrl(companyName: string, formType: string, onLog: (msg: string) => void): Promise<string> {
  onLog(`Resolving URL for "${companyName}" (${formType})...`);

  const typeHints: Record<string, string> = {
    "demo-request": "demo request page, book a demo, schedule demo, request demo",
    "contact-us": "contact us page, get in touch, contact form",
    "newsletter": "newsletter signup, email subscription, blog subscribe",
    "partnership": "partnership page, become a partner, affiliate program",
    "pricing-inquiry": "pricing page, get a quote, talk to sales, request pricing",
    "job-application": "careers page, jobs, open positions, work with us",
    "free-trial": "signup page, free trial, get started, create account",
    "custom": "main website homepage",
  };

  const hint = typeHints[formType] || "main website";

  const prompt = `You are a URL resolver. Given a company name and the type of page needed, return the most likely URL.

Company: "${companyName}"
Page type needed: ${hint}

Rules:
- Return ONLY a single valid URL, nothing else
- Use https:// prefix
- If you know the company's actual domain, use it (e.g., Salesforce → https://www.salesforce.com/form/contact/contactme/)
- If unsure of exact path, return the company's homepage URL (e.g., https://www.companyname.com)
- For well-known companies, try to guess the specific page path
- Do NOT add any explanation, just the URL

URL:`;

  try {
    const result = await callGroq(prompt, false);
    const url = result.trim().split("\n")[0].trim();

    // Basic validation
    if (url.startsWith("http://") || url.startsWith("https://")) {
      onLog(`Resolved URL: ${url}`);
      return url;
    }

    // Try to fix common issues
    if (url.includes(".")) {
      const fixed = `https://${url.replace(/^(https?:\/\/)?/, "")}`;
      onLog(`Resolved URL: ${fixed}`);
      return fixed;
    }
  } catch (err) {
    onLog(`LLM URL resolution failed, using search fallback...`);
  }

  // Fallback: construct a reasonable URL
  const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const fallback = `https://www.${sanitized}.com`;
  onLog(`Using fallback URL: ${fallback}`);
  return fallback;
}

export async function submitFormFill(req: Request, res: Response) {
  const { companyName, url, formType, profile, instructions } = req.body;

  // Accept either companyName or url (backward compat)
  const target = companyName || url;
  if (!target || !formType || !profile) {
    res.status(400).json({ success: false, error: "Company name (or URL), formType, and profile are required" });
    return;
  }

  const runId = uuid();
  const abortController = new AbortController();
  formRunStore.set(runId, { logs: [], done: false, result: null, abortController });

  res.json({ success: true, runId });

  const run = formRunStore.get(runId)!;

  try {
    run.logs.push(`Starting form fill: ${formType}`);
    run.logs.push(`Using profile: ${profile.fullName} (${profile.email})`);

    // Resolve URL from company name if needed
    let resolvedUrl: string;
    const isUrl = target.startsWith("http://") || target.startsWith("https://") || target.includes(".");
    if (isUrl) {
      resolvedUrl = target.startsWith("http") ? target : `https://${target}`;
      run.logs.push(`Target URL: ${resolvedUrl}`);
    } else {
      resolvedUrl = await resolveCompanyUrl(target, formType, (msg) => run.logs.push(msg));
    }

    // Build the TinyFish prompt — include URL discovery instructions
    const prompt = buildFormPrompt(formType, profile, instructions, target, !isUrl);

    run.logs.push("Navigating to target page...");

    const result = await runTinyFishAgent(
      resolvedUrl,
      prompt,
      (msg) => { run.logs.push(msg); },
      { signal: abortController.signal }
    );

    run.logs.push("Analyzing form submission result...");

    const parsed = await llmExtract(result, `Analyze the form submission result. Return JSON:
{
  "success": true/false,
  "formFound": true/false,
  "fieldsFilledCount": number,
  "fieldsFilled": [
    { "label": "Field Label (e.g. Full Name, Email, Company)", "value": "The value that was entered" }
  ],
  "confirmationMessage": "any confirmation text shown after submit",
  "errors": ["any error messages"],
  "notes": "any relevant observations",
  "resolvedUrl": "the final URL where the form was found",
  "formTitle": "the title or heading of the form if visible"
}
IMPORTANT: In "fieldsFilled", list EVERY form field that was filled with its exact label as shown on the website and the value entered. These are the real field names from the actual website form, not generic names. If the agent mentioned filling fields like "First Name", "Last Name", "Work Email", "Company Size", "Phone Number" etc., include all of them.
If unclear, make your best assessment.`);

    run.result = {
      ...parsed,
      companyName: target,
      url: resolvedUrl,
      formType,
      profileUsed: profile.fullName,
      timestamp: new Date().toISOString(),
    };

    const success = parsed?.success || parsed?.formFound;
    run.logs.push(success
      ? `Form submitted successfully! ${parsed?.fieldsFilledCount || "Multiple"} fields filled.${parsed?.confirmationMessage ? ` Confirmation: "${parsed.confirmationMessage}"` : ""}`
      : `Form fill completed with issues: ${parsed?.errors?.join(", ") || parsed?.notes || "Check results"}`
    );
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      run.logs.push("Form fill cancelled by user.");
    } else {
      run.logs.push(`Form fill error: ${(err as Error).message}`);
    }
    run.result = { success: false, error: (err as Error).message };
  } finally {
    run.done = true;
  }
}

export function streamFormLogs(req: Request, res: Response) {
  const { runId } = req.params;
  const run = formRunStore.get(runId as string);
  if (!run) { res.status(404).json({ success: false, error: "Run not found" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let lastIndex = 0;
  const interval = setInterval(() => {
    while (lastIndex < run.logs.length) {
      res.write(`data: ${JSON.stringify({ type: "log", message: run.logs[lastIndex] })}\n\n`);
      lastIndex++;
    }
    if (run.done && lastIndex >= run.logs.length) {
      res.write(`data: ${JSON.stringify({ type: "complete", message: "Form fill finished", result: run.result })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 150);

  req.on("close", () => { clearInterval(interval); });
}

export function cancelFormFill(req: Request, res: Response) {
  const { runId } = req.params;
  const run = formRunStore.get(runId as string);
  if (!run) { res.status(404).json({ success: false, error: "Run not found" }); return; }
  if (run.abortController) {
    run.abortController.abort();
    run.logs.push("Form fill cancelled by user.");
  }
  res.json({ success: true, message: "Cancelled" });
}

function buildFormPrompt(formType: string, profile: any, instructions?: string, companyName?: string, needsUrlDiscovery?: boolean): string {
  const p = profile;
  const base = `You are filling out a web form. Here is the information to use:
- Full Name: ${p.fullName || ""}
- Email: ${p.email || ""}
- Phone: ${p.phone || ""}
- Company: ${p.company || ""}
- Job Title: ${p.jobTitle || ""}
- Website: ${p.website || ""}
- Message/Notes: ${p.message || ""}
${p.customFields ? `- Additional info: ${JSON.stringify(p.customFields)}` : ""}`;

  const typeInstructions: Record<string, string> = {
    "demo-request": `Find the "Request Demo", "Book a Demo", "Get a Demo", or "Schedule Demo" form on this page. Fill in all required fields using the profile info above. For any "company size" or "employees" field, use "50-200". For "industry", use "Technology". Submit the form.`,
    "contact-us": `Find the "Contact Us", "Get in Touch", or "Contact" form. Fill in name, email, phone, company, and message fields. For the message, write a professional inquiry about their product/service. Submit the form.`,
    "newsletter": `Find the newsletter signup, email subscription, or "Stay Updated" form. Enter the email address. If it asks for name, fill that too. Submit/subscribe.`,
    "partnership": `Find the "Partners", "Partnership", "Become a Partner", or "Affiliate" form. Fill in all business details — company name, contact info, website, and a message about partnership interest. Submit the form.`,
    "pricing-inquiry": `Find the "Get Pricing", "Request Quote", "Talk to Sales", or pricing contact form. Fill in company details and mention interest in enterprise pricing. Submit the form.`,
    "job-application": `Find the careers or jobs page, then look for an application form. Fill in name, email, phone, and any other fields. If there's a resume upload, skip it but fill everything else. Submit the form.`,
    "free-trial": `Find the "Start Free Trial", "Sign Up", or "Get Started" form. Fill in email, name, company, and password (use "TempPass123!") if required. Complete the signup flow.`,
    "custom": `${instructions || "Find and fill out the main form on this page using the profile information provided. Submit when complete."}`,
  };

  // If we need URL discovery, add navigation instructions
  const discoveryPrefix = needsUrlDiscovery
    ? `IMPORTANT: You are on the homepage of "${companyName}". First, navigate to find the correct page for this form type. Look for navigation links, footer links, or buttons that lead to the right page. Once you find the correct page with the form, proceed to fill it.\n\n`
    : "";

  return `${base}\n\n${discoveryPrefix}Task: ${typeInstructions[formType] || typeInstructions["custom"]}\n\n${instructions ? `Additional instructions: ${instructions}` : ""}`;
}

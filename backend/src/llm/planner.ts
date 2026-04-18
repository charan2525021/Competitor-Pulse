import { callGroq, setLLMConfig } from "./groq.client";
import { callOpenAI } from "./openai.client";
import { callOllama } from "./ollama.client";
import { buildPlannerPrompt } from "./prompts";

export interface IntelPlan {
  competitors: { name: string; url: string }[];
  tasks: string[];
  maxDepth: number;
}

interface Filters {
  tasks?: string[];
  maxCompetitors?: number;
  llm?: { provider: string; model: string; apiKey: string };
}

/** Call the LLM based on the current runtime config */
async function callLLM(prompt: string, jsonMode: boolean): Promise<string> {
  const config = require("./groq.client").getLLMConfig?.();
  const provider = config?.provider || "groq";

  switch (provider) {
    case "openai":
      return callOpenAI(prompt, jsonMode);
    case "meta":
      return callOllama(prompt, jsonMode);
    case "groq":
    default:
      return callGroq(prompt, jsonMode);
  }
}

// Well-known company URLs so we never fall back to Google search links
const KNOWN_URLS: Record<string, string> = {
  slack: "https://slack.com",
  notion: "https://www.notion.so",
  linear: "https://linear.app",
  figma: "https://www.figma.com",
  asana: "https://asana.com",
  jira: "https://www.atlassian.com/software/jira",
  monday: "https://monday.com",
  "monday.com": "https://monday.com",
  trello: "https://trello.com",
  clickup: "https://clickup.com",
  stripe: "https://stripe.com",
  square: "https://squareup.com",
  hubspot: "https://www.hubspot.com",
  salesforce: "https://www.salesforce.com",
  pipedrive: "https://www.pipedrive.com",
  zendesk: "https://www.zendesk.com",
  intercom: "https://www.intercom.com",
  freshdesk: "https://www.freshdesk.com",
  zoom: "https://zoom.us",
  teams: "https://www.microsoft.com/en-us/microsoft-teams",
  "microsoft teams": "https://www.microsoft.com/en-us/microsoft-teams",
  "google meet": "https://meet.google.com",
  vercel: "https://vercel.com",
  netlify: "https://www.netlify.com",
  railway: "https://railway.app",
  render: "https://render.com",
  heroku: "https://www.heroku.com",
  datadog: "https://www.datadoghq.com",
  "new relic": "https://newrelic.com",
  grafana: "https://grafana.com",
  supabase: "https://supabase.com",
  firebase: "https://firebase.google.com",
  planetscale: "https://planetscale.com",
  github: "https://github.com",
  gitlab: "https://about.gitlab.com",
  bitbucket: "https://bitbucket.org",
  twilio: "https://www.twilio.com",
  sendgrid: "https://sendgrid.com",
  mailchimp: "https://mailchimp.com",
  airtable: "https://www.airtable.com",
  coda: "https://coda.io",
  miro: "https://miro.com",
  canva: "https://www.canva.com",
  sketch: "https://www.sketch.com",
  "adobe xd": "https://www.adobe.com/products/xd.html",
  webflow: "https://webflow.com",
  shopify: "https://www.shopify.com",
  wix: "https://www.wix.com",
  squarespace: "https://www.squarespace.com",
  amplitude: "https://amplitude.com",
  mixpanel: "https://mixpanel.com",
  segment: "https://segment.com",
  postman: "https://www.postman.com",
  insomnia: "https://insomnia.rest",
  docker: "https://www.docker.com",
  kubernetes: "https://kubernetes.io",
  terraform: "https://www.terraform.io",
  aws: "https://aws.amazon.com",
  azure: "https://azure.microsoft.com",
  gcp: "https://cloud.google.com",
  openai: "https://openai.com",
  anthropic: "https://www.anthropic.com",
  cohere: "https://cohere.com",
  loom: "https://www.loom.com",
  calendly: "https://calendly.com",
  typeform: "https://www.typeform.com",
  surveymonkey: "https://www.surveymonkey.com",
  dropbox: "https://www.dropbox.com",
  box: "https://www.box.com",
  "1password": "https://1password.com",
  lastpass: "https://www.lastpass.com",
  okta: "https://www.okta.com",
  auth0: "https://auth0.com",
  sentry: "https://sentry.io",
  launchdarkly: "https://launchdarkly.com",
  pagerduty: "https://www.pagerduty.com",
  statuspage: "https://www.atlassian.com/software/statuspage",
  confluence: "https://www.atlassian.com/software/confluence",
  basecamp: "https://basecamp.com",
  todoist: "https://todoist.com",
  evernote: "https://evernote.com",
  grammarly: "https://www.grammarly.com",
  jasper: "https://www.jasper.ai",
  copy: "https://www.copy.ai",
  descript: "https://www.descript.com",
  riverside: "https://riverside.fm",
  replit: "https://replit.com",
  codepen: "https://codepen.io",
  stackblitz: "https://stackblitz.com",
};

function resolveUrl(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (KNOWN_URLS[lower]) return KNOWN_URLS[lower];
  // Try partial match
  for (const [key, url] of Object.entries(KNOWN_URLS)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }
  return null;
}

export async function generatePlan(userInput: string, filters: Filters): Promise<IntelPlan> {
  // Set runtime LLM config if provided
  if (filters.llm) {
    setLLMConfig(filters.llm);
  }

  const prompt = buildPlannerPrompt(userInput, filters);

  let raw: string;

  try {
    raw = await callLLM(prompt, true);
    console.log("[Planner] LLM response:", raw.substring(0, 300));
  } catch (primaryErr) {
    console.warn("Primary LLM unavailable, trying fallbacks:", (primaryErr as Error).message);
    try {
      raw = await callGroq(prompt, true);
    } catch {
      try {
        raw = await callOpenAI(prompt, true);
      } catch {
        console.warn("All LLMs unavailable, using default plan");
        return getDefaultPlan(userInput, filters);
      }
    }
  }

  try {
    const plan = JSON.parse(raw) as IntelPlan;
    const validated = validatePlan(plan, filters);
    // Fix any competitors that got Google search URLs instead of real ones
    validated.competitors = validated.competitors.map((c) => {
      if (c.url.includes("google.com/search")) {
        const known = resolveUrl(c.name);
        return known ? { ...c, url: known } : c;
      }
      return c;
    });
    return validated;
  } catch {
    console.warn("Failed to parse LLM response, using default plan");
    return getDefaultPlan(userInput, filters);
  }
}

function validatePlan(plan: IntelPlan, filters: Filters): IntelPlan {
  const competitors = Array.isArray(plan.competitors)
    ? plan.competitors.filter((c) => c.name && c.url).slice(0, filters.maxCompetitors ?? 5)
    : [];

  // Ensure all URLs are real website URLs, not Google search links
  const fixedCompetitors = competitors.map((c) => {
    if (!c.url || c.url.includes("google.com/search")) {
      const known = resolveUrl(c.name);
      if (known) return { ...c, url: known };
    }
    // Ensure URL has protocol
    if (c.url && !c.url.startsWith("http")) {
      c.url = "https://" + c.url;
    }
    return c;
  });

  return {
    competitors: fixedCompetitors,
    tasks: Array.isArray(plan.tasks) ? plan.tasks : filters.tasks || ["pricing", "jobs", "reviews", "blog", "features", "social", "leads", "forms", "strategy"],
    maxDepth: typeof plan.maxDepth === "number" ? Math.min(plan.maxDepth, 5) : 3,
  };
}

function getDefaultPlan(userInput: string, filters: Filters): IntelPlan {
  // Extract company names from user input using smarter parsing
  const input = userInput.toLowerCase();

  // First try to match known companies
  const found: { name: string; url: string }[] = [];
  for (const [key, url] of Object.entries(KNOWN_URLS)) {
    if (input.includes(key) && found.length < (filters.maxCompetitors ?? 5)) {
      // Capitalize the name properly
      const name = key.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      // Avoid duplicates
      if (!found.some((f) => f.url === url)) {
        found.push({ name, url });
      }
    }
  }

  if (found.length > 0) {
    return {
      competitors: found,
      tasks: filters.tasks || ["pricing", "jobs", "reviews", "blog", "features", "social", "leads", "forms", "strategy"],
      maxDepth: 3,
    };
  }

  // If no known companies found, try to extract words that look like company names
  // (capitalized words, words after "analyze", "compare", "research", etc.)
  const cleanInput = userInput
    .replace(/[,\-–—]/g, " ")
    .replace(/\b(analyze|compare|research|check|find|look|at|and|the|for|of|vs|versus|their|what|is|are|how|does|do)\b/gi, " ")
    .trim();

  const words = cleanInput.split(/\s+/).filter((w) => w.length > 2);
  const competitors = words.slice(0, filters.maxCompetitors ?? 3).map((w) => {
    const name = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    const known = resolveUrl(w);
    return {
      name,
      url: known || `https://${w.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    };
  });

  return {
    competitors: competitors.length > 0 ? competitors : [
      { name: "Notion", url: "https://www.notion.so" },
    ],
    tasks: filters.tasks || ["pricing", "jobs", "reviews", "blog", "features", "social", "leads", "forms", "strategy"],
    maxDepth: 3,
  };
}

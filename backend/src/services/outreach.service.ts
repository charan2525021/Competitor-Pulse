
import nodemailer from "nodemailer";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// ── Types ──

export interface SenderIdentity {
  id: string;
  fromName: string;
  fromEmail: string;
  useGmailSmtp: boolean;
  gmailAppPassword?: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  senderId: string;
  status: "draft" | "sending" | "sent" | "failed";
  createdAt: string;
  sentAt?: string;
  recipients: CampaignRecipient[];
  stats: { total: number; sent: number; failed: number };
}

export interface CampaignRecipient {
  leadId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  sentAt?: string;
}

// ── In-memory stores ──
const DATA_DIR = path.join(__dirname, "../../data");
const SENDER_FILE = path.join(DATA_DIR, "senderIdentities.json");
const CAMPAIGN_FILE = path.join(DATA_DIR, "campaigns.json");
const senderIdentities = new Map<string, SenderIdentity>();
const campaigns = new Map<string, Campaign>();
const campaignLogs = new Map<string, string[]>();

// Ensure data dir exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load senderIdentities from disk
function loadSenderIdentities() {
  try {
    ensureDataDir();
    if (fs.existsSync(SENDER_FILE)) {
      const raw = fs.readFileSync(SENDER_FILE, "utf-8");
      const arr: SenderIdentity[] = JSON.parse(raw);
      senderIdentities.clear();
      arr.forEach((s) => senderIdentities.set(s.id, s));
      console.log(`Loaded ${arr.length} sender identities from disk`);
    }
  } catch (e) {
    console.error("Failed to load senderIdentities:", e);
  }
}

// Save senderIdentities to disk
function saveSenderIdentities() {
  try {
    ensureDataDir();
    fs.writeFileSync(SENDER_FILE, JSON.stringify([...senderIdentities.values()], null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save senderIdentities:", e);
  }
}

// Load campaigns from disk
function loadCampaigns() {
  try {
    ensureDataDir();
    if (fs.existsSync(CAMPAIGN_FILE)) {
      const raw = fs.readFileSync(CAMPAIGN_FILE, "utf-8");
      const arr: Campaign[] = JSON.parse(raw);
      campaigns.clear();
      arr.forEach((c) => campaigns.set(c.id, c));
      console.log(`Loaded ${arr.length} campaigns from disk`);
    }
  } catch (e) {
    console.error("Failed to load campaigns:", e);
  }
}

// Save campaigns to disk
function persistCampaigns() {
  try {
    ensureDataDir();
    fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify([...campaigns.values()], null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save campaigns:", e);
  }
}

// Load on startup
loadSenderIdentities();
loadCampaigns();

// ── Sender Identity ──


export function saveSenderIdentity(fromName: string, fromEmail: string, useGmailSmtp: boolean, gmailAppPassword?: string): SenderIdentity {
  const id = "sender_" + uuid().slice(0, 8);
  const identity: SenderIdentity = { id, fromName, fromEmail, useGmailSmtp, gmailAppPassword: useGmailSmtp ? gmailAppPassword : undefined };
  senderIdentities.set(id, identity);
  saveSenderIdentities();
  return identity;
}

export function getSenderIdentities(): SenderIdentity[] {
  return [...senderIdentities.values()];
}


export function updateSenderIdentity(id: string, fromName: string, fromEmail: string, useGmailSmtp: boolean, gmailAppPassword?: string): SenderIdentity | null {
  const existing = senderIdentities.get(id);
  if (!existing) return null;
  existing.fromName = fromName;
  existing.fromEmail = fromEmail;
  existing.useGmailSmtp = useGmailSmtp;
  existing.gmailAppPassword = useGmailSmtp ? gmailAppPassword : undefined;
  saveSenderIdentities();
  return existing;
}

export function deleteSenderIdentity(id: string): boolean {
  const result = senderIdentities.delete(id);
  saveSenderIdentities();
  return result;
}

// ── Campaign CRUD ──

export function createCampaign(data: {
  name: string; subject: string; body: string; senderId: string;
  leads: { id: string; name: string; email: string; company: string; role: string }[];
}): Campaign {
  const id = "camp_" + uuid().slice(0, 8);
  const campaign: Campaign = {
    id, name: data.name, subject: data.subject, body: data.body,
    senderId: data.senderId, status: "draft", createdAt: new Date().toISOString(),
    recipients: data.leads.filter((l) => l.email).map((l) => ({
      leadId: l.id, name: l.name, email: l.email, company: l.company, role: l.role, status: "pending" as const,
    })),
    stats: { total: data.leads.filter((l) => l.email).length, sent: 0, failed: 0 },
  };
  campaigns.set(id, campaign);
  campaignLogs.set(id, []);
  persistCampaigns();
  return campaign;
}

export function getCampaigns(): Campaign[] {
  return [...campaigns.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCampaign(id: string): Campaign | undefined {
  return campaigns.get(id);
}

export function deleteCampaign(id: string): boolean {
  campaignLogs.delete(id);
  const result = campaigns.delete(id);
  persistCampaigns();
  return result;
}

export function updateCampaign(id: string, data: { name?: string; subject?: string; body?: string; senderId?: string }): Campaign | null {
  const campaign = campaigns.get(id);
  if (!campaign || campaign.status === "sending") return null;
  if (data.name) campaign.name = data.name;
  if (data.subject) campaign.subject = data.subject;
  if (data.body !== undefined) campaign.body = data.body;
  if (data.senderId) campaign.senderId = data.senderId;
  persistCampaigns();
  return campaign;
}

export function addCampaignRecipients(id: string, newLeads: { id: string; name: string; email: string; company: string; role: string }[]): Campaign | null {
  const campaign = campaigns.get(id);
  if (!campaign || campaign.status === "sent" || campaign.status === "sending") return null;
  const existingEmails = new Set(campaign.recipients.map(r => r.email));
  const toAdd = newLeads.filter(l => l.email && !existingEmails.has(l.email));
  for (const l of toAdd) {
    campaign.recipients.push({ leadId: l.id, name: l.name, email: l.email, company: l.company, role: l.role, status: "pending" });
  }
  campaign.stats.total = campaign.recipients.length;
  persistCampaigns();
  return campaign;
}

export function removeRecipient(campaignId: string, email: string): Campaign | null {
  const campaign = campaigns.get(campaignId);
  if (!campaign || campaign.status === "sending") return null;
  campaign.recipients = campaign.recipients.filter(r => r.email !== email);
  campaign.stats.total = campaign.recipients.length;
  campaign.stats.sent = campaign.recipients.filter(r => r.status === "sent").length;
  campaign.stats.failed = campaign.recipients.filter(r => r.status === "failed").length;
  persistCampaigns();
  return campaign;
}

export function getCampaignLogs(id: string): string[] {
  return campaignLogs.get(id) || [];
}


// ── Personalization ──

function personalize(template: string, lead: CampaignRecipient): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name || "")
    .replace(/\{\{company\}\}/g, lead.company || "")
    .replace(/\{\{role\}\}/g, lead.role || "")
    .replace(/\{\{email\}\}/g, lead.email || "")
    .replace(/\{\{first_name\}\}/g, (lead.name || "").split(" ")[0] || "");
}

// ── Build HTML email ──

function buildHtmlEmail(bodyText: string, lead: CampaignRecipient): string {
  const personalized = personalize(bodyText, lead);
  // Convert line breaks to HTML paragraphs
  const paragraphs = personalized
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 18px 0;line-height:1.7;color:#374151;font-size:15px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const firstName = lead.name.split(" ")[0] || lead.name;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f4f8;">
    <tr><td style="padding:40px 20px;">
      <table align="center" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

        <!-- Header with gradient accent -->
        <tr><td style="background:linear-gradient(135deg,#0d9488,#0891b2);border-radius:12px 12px 0 0;padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">CompetitorPulse</h1>
                <p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);font-weight:400;">AI-Powered Intelligence</p>
              </td>
              <td align="right" valign="middle">
                <div style="width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;line-height:42px;">
                  <span style="font-size:20px;">⚡</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Greeting bar -->
        <tr><td style="background-color:#ffffff;padding:28px 40px 0 40px;">
          <p style="margin:0 0 20px 0;font-size:16px;color:#0d9488;font-weight:600;">Hi ${firstName} 👋</p>
        </td></tr>

        <!-- Body content -->
        <tr><td style="background-color:#ffffff;padding:0 40px 12px 40px;">
          ${paragraphs}
        </td></tr>

        <!-- Divider + footer -->
        <tr><td style="background-color:#ffffff;padding:0 40px 32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td style="border-top:1px solid #e5e7eb;padding-top:20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:600;color:#374151;">CompetitorPulse</p>
                    <p style="margin:3px 0 0 0;font-size:12px;color:#9ca3af;">Competitive Intelligence Platform</p>
                  </td>
                  <td align="right" valign="middle">
                    <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:4px 12px;">
                      <span style="font-size:11px;color:#16a34a;font-weight:500;">✓ Verified Sender</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Bottom rounded corners -->
        <tr><td style="background-color:#ffffff;border-radius:0 0 12px 12px;padding:0;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Footer text -->
        <tr><td style="padding:24px 40px 0 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
            Sent via <span style="color:#6b7280;font-weight:500;">CompetitorPulse</span> · AI-powered outreach
          </p>
          <p style="margin:8px 0 0 0;font-size:11px;color:#d1d5db;">
            &copy; ${new Date().getFullYear()} CompetitorPulse. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send Campaign ──

export async function sendCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const campaign = campaigns.get(campaignId);
  if (!campaign) return { success: false, error: "Campaign not found" };

  const sender = senderIdentities.get(campaign.senderId);
  if (!sender) return { success: false, error: "Sender identity not found. Add one first." };

  const pendingRecipients = campaign.recipients.filter((r) => r.status === "pending");
  if (pendingRecipients.length === 0) return { success: false, error: "No pending recipients" };

  campaign.status = "sending";
  const logs = campaignLogs.get(campaignId) || [];
  logs.push(`[${ts()}] Starting campaign "${campaign.name}" — ${pendingRecipients.length} recipients`);
  logs.push(`[${ts()}] Sender: "${sender.fromName}" <${sender.fromEmail}>`);

  // Resolve SMTP credentials: prefer .env, fall back to sender's gmailAppPassword
  const smtpUser = process.env.SMTP_USER || sender.fromEmail;
  const smtpPass = sender.useGmailSmtp && sender.gmailAppPassword
    ? sender.gmailAppPassword
    : process.env.SMTP_PASS || "";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!smtpPass) {
    campaign.status = "failed";
    logs.push(`[${ts()}] No SMTP password found. Set SMTP_PASS in .env or provide Gmail App Password.`);
    return { success: false, error: "No SMTP password configured. Set SMTP_PASS in .env file." };
  }

  let transporter: nodemailer.Transporter;

  logs.push(`[${ts()}] Using SMTP (${smtpHost}:${smtpPort})`);
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.verify();
    logs.push(`[${ts()}] SMTP connection verified ✓`);
  } catch (err: any) {
    campaign.status = "failed";
    logs.push(`[${ts()}] SMTP connection failed: ${err.message}`);
    return { success: false, error: `SMTP connection failed: ${err.message}. Check your SMTP_USER/SMTP_PASS in .env.` };
  }

  for (const recipient of pendingRecipients) {
    const subject = personalize(campaign.subject, recipient);
    const personalizedBody = personalize(campaign.body, recipient);
    const firstName = (recipient.name || "").split(" ")[0] || recipient.name;
    const textBody = `Hi ${firstName},\n\n${personalizedBody}\n\n--\n${sender.fromName}\nCompetitorPulse`;
    const htmlBody = buildHtmlEmail(campaign.body, recipient);

    try {
      logs.push(`[${ts()}] Sending to ${recipient.name} <${recipient.email}>...`);
      const fromEmail = process.env.SMTP_FROM || sender.fromEmail;
      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${fromEmail.split("@")[1]}>`;
      await transporter.sendMail({
        from: `"${sender.fromName}" <${fromEmail}>`,
        to: recipient.email,
        replyTo: `"${sender.fromName}" <${fromEmail}>`,
        subject,
        html: htmlBody,
        text: textBody,
        messageId,
        headers: {
          "X-Mailer": "CompetitorPulse",
          "X-Priority": "3",
          "Precedence": "bulk",
          "List-Unsubscribe": `<mailto:${fromEmail}?subject=unsubscribe>`,
          "MIME-Version": "1.0",
        },
      });
      recipient.status = "sent";
      recipient.sentAt = new Date().toISOString();
      campaign.stats.sent++;
      logs.push(`[${ts()}] ✓ Sent to ${recipient.name} <${recipient.email}>`);
    } catch (err: any) {
      recipient.status = "failed";
      recipient.error = err.message;
      campaign.stats.failed++;
      logs.push(`[${ts()}] ✗ Failed ${recipient.email}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  campaign.status = campaign.stats.failed === campaign.stats.total ? "failed" : "sent";
  campaign.sentAt = new Date().toISOString();
  logs.push(`[${ts()}] Campaign complete — ${campaign.stats.sent} sent, ${campaign.stats.failed} failed`);
  persistCampaigns();

  return { success: true };
}

function ts(): string {
  return new Date().toLocaleTimeString();
}

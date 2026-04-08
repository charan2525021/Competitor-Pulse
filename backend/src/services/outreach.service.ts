import nodemailer from "nodemailer";
import { v4 as uuid } from "uuid";

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

const senderIdentities = new Map<string, SenderIdentity>();
const campaigns = new Map<string, Campaign>();
const campaignLogs = new Map<string, string[]>();

// ── Sender Identity ──

export function saveSenderIdentity(fromName: string, fromEmail: string, useGmailSmtp: boolean, gmailAppPassword?: string): SenderIdentity {
  const id = "sender_" + uuid().slice(0, 8);
  const identity: SenderIdentity = { id, fromName, fromEmail, useGmailSmtp, gmailAppPassword: useGmailSmtp ? gmailAppPassword : undefined };
  senderIdentities.set(id, identity);
  return identity;
}

export function getSenderIdentities(): SenderIdentity[] {
  return [...senderIdentities.values()];
}

export function deleteSenderIdentity(id: string): boolean {
  return senderIdentities.delete(id);
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
  return campaigns.delete(id);
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

  let transporter: nodemailer.Transporter;

  if (sender.useGmailSmtp) {
    logs.push(`[${ts()}] Using Gmail SMTP (smtp.gmail.com:587)`);
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: sender.fromEmail, pass: sender.gmailAppPassword },
    });

    try {
      await transporter.verify();
      logs.push(`[${ts()}] Gmail SMTP connection verified ✓`);
    } catch (err: any) {
      campaign.status = "failed";
      logs.push(`[${ts()}] Gmail SMTP connection failed: ${err.message}`);
      return { success: false, error: `Gmail SMTP failed: ${err.message}. Check your App Password.` };
    }
  } else {
    logs.push(`[${ts()}] Using direct transport (local MX resolution)`);
    transporter = nodemailer.createTransport({ direct: true } as any);
  }

  for (const recipient of pendingRecipients) {
    const subject = personalize(campaign.subject, recipient);
    const textBody = personalize(campaign.body, recipient);
    const htmlBody = textBody.replace(/\n/g, "<br>");

    try {
      logs.push(`[${ts()}] Sending to ${recipient.name} <${recipient.email}>...`);
      await transporter.sendMail({
        from: `"${sender.fromName}" <${sender.fromEmail}>`,
        to: recipient.email,
        subject,
        html: htmlBody,
        text: textBody,
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

  return { success: true };
}

function ts(): string {
  return new Date().toLocaleTimeString();
}

"use server"

import nodemailer from "nodemailer"

// Types
export interface SenderIdentity {
  id: string
  fromName: string
  fromEmail: string
  useGmailSmtp: boolean
  gmailAppPassword?: string
  createdAt: Date
}

export interface CampaignRecipient {
  email: string
  name?: string
  company?: string
  role?: string
  status: "pending" | "sent" | "failed"
  sentAt?: Date
  error?: string
}

export interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  senderId: string
  status: "draft" | "sending" | "sent" | "failed"
  recipients: CampaignRecipient[]
  stats: {
    total: number
    sent: number
    failed: number
  }
  createdAt: Date
  sentAt?: Date
}

export interface CampaignLog {
  id: string
  campaignId: string
  recipientEmail: string
  status: "sent" | "failed"
  message: string
  timestamp: Date
}

// In-memory stores
const senderIdentities = new Map<string, SenderIdentity>()
const campaigns = new Map<string, Campaign>()
const campaignLogs = new Map<string, CampaignLog[]>()

// Sender Identity functions
export function createSenderIdentity(data: Omit<SenderIdentity, "id" | "createdAt">): SenderIdentity {
  const id = `sender-${Date.now()}`
  const sender: SenderIdentity = {
    ...data,
    id,
    createdAt: new Date()
  }
  senderIdentities.set(id, sender)
  return sender
}

export function getSenderIdentity(id: string): SenderIdentity | undefined {
  const sender = senderIdentities.get(id)
  if (sender) {
    // Mask password in response
    return {
      ...sender,
      gmailAppPassword: sender.gmailAppPassword ? "********" : undefined
    }
  }
  return undefined
}

export function getAllSenderIdentities(): SenderIdentity[] {
  return Array.from(senderIdentities.values()).map(sender => ({
    ...sender,
    gmailAppPassword: sender.gmailAppPassword ? "********" : undefined
  }))
}

export function updateSenderIdentity(id: string, data: Partial<SenderIdentity>): SenderIdentity | null {
  const sender = senderIdentities.get(id)
  if (!sender) return null
  
  const updated = { ...sender, ...data }
  senderIdentities.set(id, updated)
  return updated
}

export function deleteSenderIdentity(id: string): boolean {
  return senderIdentities.delete(id)
}

// Campaign functions
export function createCampaign(data: Omit<Campaign, "id" | "createdAt" | "stats">): Campaign {
  const id = `campaign-${Date.now()}`
  const campaign: Campaign = {
    ...data,
    id,
    stats: {
      total: data.recipients.length,
      sent: 0,
      failed: 0
    },
    createdAt: new Date()
  }
  campaigns.set(id, campaign)
  campaignLogs.set(id, [])
  return campaign
}

export function getCampaign(id: string): Campaign | undefined {
  return campaigns.get(id)
}

export function getAllCampaigns(): Campaign[] {
  return Array.from(campaigns.values())
}

export function updateCampaign(id: string, data: Partial<Campaign>): Campaign | null {
  const campaign = campaigns.get(id)
  if (!campaign) return null
  
  const updated = { ...campaign, ...data }
  campaigns.set(id, updated)
  return updated
}

export function deleteCampaign(id: string): boolean {
  campaignLogs.delete(id)
  return campaigns.delete(id)
}

export function getCampaignLogs(id: string): CampaignLog[] {
  return campaignLogs.get(id) || []
}

// Email sending
export async function sendCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const campaign = campaigns.get(campaignId)
  if (!campaign) {
    return { success: false, error: "Campaign not found" }
  }

  const sender = senderIdentities.get(campaign.senderId)
  if (!sender) {
    return { success: false, error: "Sender identity not found" }
  }

  // Validate Gmail SMTP settings
  if (sender.useGmailSmtp && !sender.gmailAppPassword) {
    return { success: false, error: "Gmail App Password is required for SMTP" }
  }

  // Update campaign status
  campaign.status = "sending"
  campaigns.set(campaignId, campaign)

  const logs = campaignLogs.get(campaignId) || []

  try {
    // Create transport
    let transporter: nodemailer.Transporter

    if (sender.useGmailSmtp) {
      // Gmail SMTP with App Password
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: sender.fromEmail,
          pass: sender.gmailAppPassword
        }
      })

      // Verify connection
      try {
        await transporter.verify()
      } catch (error) {
        campaign.status = "failed"
        campaigns.set(campaignId, campaign)
        return { 
          success: false, 
          error: `Gmail SMTP connection failed: ${error instanceof Error ? error.message : "Unknown error"}` 
        }
      }
    } else {
      // Direct transport (resolves MX records)
      transporter = nodemailer.createTransport({
        direct: true
      })
    }

    // Send to each recipient
    for (const recipient of campaign.recipients) {
      if (recipient.status === "sent") continue

      try {
        // Personalize subject and body
        const personalizedSubject = personalizeContent(campaign.subject, recipient)
        const personalizedBody = personalizeContent(campaign.body, recipient)

        await transporter.sendMail({
          from: `"${sender.fromName}" <${sender.fromEmail}>`,
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedBody,
          text: stripHtml(personalizedBody)
        })

        recipient.status = "sent"
        recipient.sentAt = new Date()
        campaign.stats.sent++

        logs.push({
          id: `log-${Date.now()}`,
          campaignId,
          recipientEmail: recipient.email,
          status: "sent",
          message: "Email sent successfully",
          timestamp: new Date()
        })

      } catch (error) {
        recipient.status = "failed"
        recipient.error = error instanceof Error ? error.message : "Unknown error"
        campaign.stats.failed++

        logs.push({
          id: `log-${Date.now()}`,
          campaignId,
          recipientEmail: recipient.email,
          status: "failed",
          message: recipient.error,
          timestamp: new Date()
        })
      }

      // Delay between emails (800ms)
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    campaign.status = campaign.stats.failed === 0 ? "sent" : "failed"
    campaign.sentAt = new Date()
    campaigns.set(campaignId, campaign)
    campaignLogs.set(campaignId, logs)

    return { success: true }

  } catch (error) {
    campaign.status = "failed"
    campaigns.set(campaignId, campaign)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

// Personalization helpers
function personalizeContent(content: string, recipient: CampaignRecipient): string {
  let result = content

  // Replace placeholders
  result = result.replace(/\{\{name\}\}/g, recipient.name || "there")
  result = result.replace(/\{\{first_name\}\}/g, recipient.name?.split(" ")[0] || "there")
  result = result.replace(/\{\{company\}\}/g, recipient.company || "your company")
  result = result.replace(/\{\{role\}\}/g, recipient.role || "your role")
  result = result.replace(/\{\{email\}\}/g, recipient.email)

  return result
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

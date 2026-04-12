import { NextRequest, NextResponse } from "next/server"
import {
  createSenderIdentity,
  getSenderIdentity,
  getAllSenderIdentities,
  updateSenderIdentity,
  deleteSenderIdentity,
  createCampaign,
  getCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
  getCampaignLogs,
  sendCampaign
} from "@/lib/services/outreach"

// POST /api/outreach - Handle various outreach actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // Sender Identity actions
      case "createSender": {
        const { fromName, fromEmail, useGmailSmtp, gmailAppPassword } = body
        
        if (!fromName || !fromEmail) {
          return NextResponse.json(
            { success: false, error: "fromName and fromEmail are required" },
            { status: 400 }
          )
        }

        if (useGmailSmtp && !gmailAppPassword) {
          return NextResponse.json(
            { success: false, error: "Gmail App Password required when using Gmail SMTP" },
            { status: 400 }
          )
        }

        const sender = createSenderIdentity({
          fromName,
          fromEmail,
          useGmailSmtp: useGmailSmtp || false,
          gmailAppPassword
        })

        return NextResponse.json({ success: true, sender })
      }

      case "updateSender": {
        const { senderId, ...data } = body
        if (!senderId) {
          return NextResponse.json(
            { success: false, error: "senderId is required" },
            { status: 400 }
          )
        }

        const sender = updateSenderIdentity(senderId, data)
        if (!sender) {
          return NextResponse.json(
            { success: false, error: "Sender not found" },
            { status: 404 }
          )
        }

        return NextResponse.json({ success: true, sender })
      }

      case "deleteSender": {
        const { senderId } = body
        if (!senderId) {
          return NextResponse.json(
            { success: false, error: "senderId is required" },
            { status: 400 }
          )
        }

        const deleted = deleteSenderIdentity(senderId)
        return NextResponse.json({ success: deleted })
      }

      // Campaign actions
      case "createCampaign": {
        const { name, subject, body: emailBody, senderId, recipients } = body
        
        if (!name || !subject || !emailBody || !senderId) {
          return NextResponse.json(
            { success: false, error: "name, subject, body, and senderId are required" },
            { status: 400 }
          )
        }

        const sender = getSenderIdentity(senderId)
        if (!sender) {
          return NextResponse.json(
            { success: false, error: "Sender identity not found" },
            { status: 404 }
          )
        }

        const campaign = createCampaign({
          name,
          subject,
          body: emailBody,
          senderId,
          status: "draft",
          recipients: (recipients || []).map((r: { email: string; name?: string; company?: string; role?: string }) => ({
            ...r,
            status: "pending" as const
          }))
        })

        return NextResponse.json({ success: true, campaign })
      }

      case "updateCampaign": {
        const { campaignId, ...data } = body
        if (!campaignId) {
          return NextResponse.json(
            { success: false, error: "campaignId is required" },
            { status: 400 }
          )
        }

        const campaign = updateCampaign(campaignId, data)
        if (!campaign) {
          return NextResponse.json(
            { success: false, error: "Campaign not found" },
            { status: 404 }
          )
        }

        return NextResponse.json({ success: true, campaign })
      }

      case "deleteCampaign": {
        const { campaignId } = body
        if (!campaignId) {
          return NextResponse.json(
            { success: false, error: "campaignId is required" },
            { status: 400 }
          )
        }

        const deleted = deleteCampaign(campaignId)
        return NextResponse.json({ success: deleted })
      }

      case "sendCampaign": {
        const { campaignId } = body
        if (!campaignId) {
          return NextResponse.json(
            { success: false, error: "campaignId is required" },
            { status: 400 }
          )
        }

        const result = await sendCampaign(campaignId)
        
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          )
        }

        const campaign = getCampaign(campaignId)
        return NextResponse.json({ success: true, campaign })
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Outreach error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET /api/outreach - Get senders, campaigns, or logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    switch (type) {
      case "senders":
        if (id) {
          const sender = getSenderIdentity(id)
          if (!sender) {
            return NextResponse.json(
              { success: false, error: "Sender not found" },
              { status: 404 }
            )
          }
          return NextResponse.json({ success: true, sender })
        }
        return NextResponse.json({ success: true, senders: getAllSenderIdentities() })

      case "campaigns":
        if (id) {
          const campaign = getCampaign(id)
          if (!campaign) {
            return NextResponse.json(
              { success: false, error: "Campaign not found" },
              { status: 404 }
            )
          }
          return NextResponse.json({ success: true, campaign })
        }
        return NextResponse.json({ success: true, campaigns: getAllCampaigns() })

      case "logs":
        if (!id) {
          return NextResponse.json(
            { success: false, error: "Campaign ID required for logs" },
            { status: 400 }
          )
        }
        return NextResponse.json({ success: true, logs: getCampaignLogs(id) })

      default:
        return NextResponse.json({
          success: true,
          senders: getAllSenderIdentities(),
          campaigns: getAllCampaigns()
        })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

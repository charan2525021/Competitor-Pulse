import { Request, Response } from "express";
import {
  saveSenderIdentity,
  getSenderIdentities,
  deleteSenderIdentity,
  createCampaign,
  getCampaigns,
  getCampaign,
  deleteCampaign,
  sendCampaign,
  getCampaignLogs,
} from "../services/outreach.service";

// ── Sender Identity ──

export function handleSaveSender(req: Request, res: Response) {
  const { fromName, fromEmail, useGmailSmtp, gmailAppPassword } = req.body;
  if (!fromName || !fromEmail) {
    res.status(400).json({ success: false, error: "fromName and fromEmail are required" });
    return;
  }
  if (useGmailSmtp && !gmailAppPassword) {
    res.status(400).json({ success: false, error: "Gmail App Password is required when Gmail SMTP is enabled" });
    return;
  }
  const identity = saveSenderIdentity(fromName, fromEmail, !!useGmailSmtp, gmailAppPassword);
  res.json({ success: true, sender: { ...identity, gmailAppPassword: identity.gmailAppPassword ? "••••••••" : undefined } });
}

export function handleGetSenders(_req: Request, res: Response) {
  const senders = getSenderIdentities().map((s) => ({ ...s, gmailAppPassword: s.gmailAppPassword ? "••••••••" : undefined }));
  res.json({ success: true, senders });
}

export function handleDeleteSender(req: Request, res: Response) {
  deleteSenderIdentity(req.params.id as string);
  res.json({ success: true });
}

// ── Campaigns ──

export function handleCreateCampaign(req: Request, res: Response) {
  const { name, subject, body, senderId, leads } = req.body;
  if (!name || !subject || !body || !senderId || !leads?.length) {
    res.status(400).json({ success: false, error: "name, subject, body, senderId, and leads are required" });
    return;
  }
  const campaign = createCampaign({ name, subject, body, senderId, leads });
  res.json({ success: true, campaign });
}

export function handleGetCampaigns(_req: Request, res: Response) {
  res.json({ success: true, campaigns: getCampaigns() });
}

export function handleGetCampaign(req: Request, res: Response) {
  const campaign = getCampaign(req.params.id as string);
  if (!campaign) { res.status(404).json({ success: false, error: "Not found" }); return; }
  res.json({ success: true, campaign });
}

export function handleDeleteCampaign(req: Request, res: Response) {
  deleteCampaign(req.params.id as string);
  res.json({ success: true });
}

export async function handleSendCampaign(req: Request, res: Response) {
  const result = await sendCampaign(req.params.id as string);
  res.json(result);
}

export function handleGetCampaignLogs(req: Request, res: Response) {
  const logs = getCampaignLogs(req.params.id as string);
  res.json({ success: true, logs });
}

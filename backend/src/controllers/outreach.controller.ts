import { Request, Response } from "express";
import {
  saveSenderIdentity,
  getSenderIdentities,
  deleteSenderIdentity,
  updateSenderIdentity,
  createCampaign,
  getCampaigns,
  getCampaign,
  deleteCampaign,
  sendCampaign,
  getCampaignLogs,
  updateCampaign,
  addCampaignRecipients,
  removeRecipient,
} from "../services/outreach.service";

// ── Sender Identity ──

export function handleSaveSender(req: Request, res: Response) {
  const { fromName, fromEmail, useGmailSmtp, gmailAppPassword } = req.body;
  if (!fromName || !fromEmail) {
    res.status(400).json({ success: false, error: "fromName and fromEmail are required" });
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

export function handleUpdateSender(req: Request, res: Response) {
  const { fromName, fromEmail, useGmailSmtp, gmailAppPassword } = req.body;
  if (!fromName || !fromEmail) {
    res.status(400).json({ success: false, error: "fromName and fromEmail are required" });
    return;
  }
  const updated = updateSenderIdentity(req.params.id as string, fromName, fromEmail, !!useGmailSmtp, gmailAppPassword);
  if (!updated) { res.status(404).json({ success: false, error: "Sender not found" }); return; }
  res.json({ success: true, sender: { ...updated, gmailAppPassword: updated.gmailAppPassword ? "••••••••" : undefined } });
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

export function handleUpdateCampaign(req: Request, res: Response) {
  const { name, subject, body, senderId } = req.body;
  const updated = updateCampaign(req.params.id as string, { name, subject, body, senderId });
  if (!updated) { res.status(400).json({ success: false, error: "Campaign not found or already sent" }); return; }
  res.json({ success: true, campaign: updated });
}

export function handleAddRecipients(req: Request, res: Response) {
  const { leads } = req.body;
  if (!leads?.length) { res.status(400).json({ success: false, error: "leads array is required" }); return; }
  const updated = addCampaignRecipients(req.params.id as string, leads);
  if (!updated) { res.status(400).json({ success: false, error: "Campaign not found or already sent" }); return; }
  res.json({ success: true, campaign: updated });
}

export function handleRemoveRecipient(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) { res.status(400).json({ success: false, error: "email is required" }); return; }
  const updated = removeRecipient(req.params.id as string, email);
  if (!updated) { res.status(400).json({ success: false, error: "Campaign not found or currently sending" }); return; }
  res.json({ success: true, campaign: updated });
}

export async function handleSendCampaign(req: Request, res: Response) {
  const result = await sendCampaign(req.params.id as string);
  res.json(result);
}

export function handleGetCampaignLogs(req: Request, res: Response) {
  const logs = getCampaignLogs(req.params.id as string);
  res.json({ success: true, logs });
}

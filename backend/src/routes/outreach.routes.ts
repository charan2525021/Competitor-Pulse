import { Router } from "express";
import {
  handleSaveSender,
  handleGetSenders,
  handleDeleteSender,
  handleUpdateSender,
  handleCreateCampaign,
  handleGetCampaigns,
  handleGetCampaign,
  handleDeleteCampaign,
  handleSendCampaign,
  handleGetCampaignLogs,
  handleUpdateCampaign,
  handleAddRecipients,
  handleRemoveRecipient,
} from "../controllers/outreach.controller";

const router = Router();

// Sender Identity
router.post("/senders", handleSaveSender);
router.get("/senders", handleGetSenders);
router.put("/senders/:id", handleUpdateSender);
router.delete("/senders/:id", handleDeleteSender);

// Campaigns
router.post("/campaigns", handleCreateCampaign);
router.get("/campaigns", handleGetCampaigns);
router.get("/campaigns/:id", handleGetCampaign);
router.put("/campaigns/:id", handleUpdateCampaign);
router.post("/campaigns/:id/recipients", handleAddRecipients);
router.delete("/campaigns/:id/recipients", handleRemoveRecipient);
router.delete("/campaigns/:id", handleDeleteCampaign);
router.post("/campaigns/:id/send", handleSendCampaign);
router.get("/campaigns/:id/logs", handleGetCampaignLogs);

export default router;

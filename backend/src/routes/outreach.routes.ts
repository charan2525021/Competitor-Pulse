import { Router } from "express";
import {
  handleSaveSender,
  handleGetSenders,
  handleDeleteSender,
  handleCreateCampaign,
  handleGetCampaigns,
  handleGetCampaign,
  handleDeleteCampaign,
  handleSendCampaign,
  handleGetCampaignLogs,
} from "../controllers/outreach.controller";

const router = Router();

// Sender Identity
router.post("/senders", handleSaveSender);
router.get("/senders", handleGetSenders);
router.delete("/senders/:id", handleDeleteSender);

// Campaigns
router.post("/campaigns", handleCreateCampaign);
router.get("/campaigns", handleGetCampaigns);
router.get("/campaigns/:id", handleGetCampaign);
router.delete("/campaigns/:id", handleDeleteCampaign);
router.post("/campaigns/:id/send", handleSendCampaign);
router.get("/campaigns/:id/logs", handleGetCampaignLogs);

export default router;

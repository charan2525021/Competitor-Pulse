import { Router } from "express";
import { searchLeads, streamLeadLogs, getLeadResults, cancelLeadSearch, sendOutreach } from "../controllers/leads.controller";

const router = Router();

router.post("/search", searchLeads);
router.get("/logs/:runId", streamLeadLogs);
router.get("/results/:runId", getLeadResults);
router.post("/cancel/:runId", cancelLeadSearch);
router.post("/outreach", sendOutreach);

export default router;

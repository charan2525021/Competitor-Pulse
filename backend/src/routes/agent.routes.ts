import { Router } from "express";
import { startAgent, streamLogs, getRunReports, cancelAgent } from "../controllers/agent.controller";

const router = Router();

router.post("/start", startAgent);
router.post("/cancel/:runId", cancelAgent);
router.get("/logs/:runId", streamLogs);
router.get("/reports/:runId", getRunReports);

export default router;

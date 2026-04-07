import { Router } from "express";
import { runStrategy, streamStrategyLogs, cancelStrategy } from "../controllers/strategy.controller";

const router = Router();

router.post("/run", runStrategy);
router.get("/logs/:runId", streamStrategyLogs);
router.post("/cancel/:runId", cancelStrategy);

export default router;

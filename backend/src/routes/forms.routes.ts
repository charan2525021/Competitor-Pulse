import { Router } from "express";
import { submitFormFill, streamFormLogs, cancelFormFill } from "../controllers/forms.controller";

const router = Router();

router.post("/fill", submitFormFill);
router.get("/logs/:runId", streamFormLogs);
router.post("/cancel/:runId", cancelFormFill);

export default router;

import { Router } from "express";
import { getConfig, saveConfig, getData, saveData, deleteItem } from "../controllers/store.controller";

const router = Router();

router.get("/config", getConfig);
router.post("/config", saveConfig);
router.get("/:collection", getData);
router.post("/:collection", saveData);
router.delete("/:collection/:id", deleteItem);

export default router;

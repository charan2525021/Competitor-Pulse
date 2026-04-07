import { Request, Response } from "express";
import { loadStore, saveStore, removeFromStore, loadConfig, saveConfig } from "../services/store";

// ── Config (LLM settings, TinyFish key, filters) ──

export function getConfig(_req: Request, res: Response) {
  const config = loadConfig();
  res.json({ success: true, config });
}

export function postConfig(req: Request, res: Response) {
  const { config } = req.body;
  if (!config) { res.status(400).json({ success: false, error: "config required" }); return; }
  saveConfig(config);
  res.json({ success: true });
}

// ── Generic collection endpoints ──

export function getData(req: Request, res: Response) {
  const collection = req.params.collection as string;
  const allowed = ["history", "intel", "leads", "leadHistory", "fillHistory", "formProfiles"];
  if (!allowed.includes(collection)) {
    res.status(400).json({ success: false, error: "Invalid collection" });
    return;
  }
  const data = loadStore(collection, []);
  res.json({ success: true, data });
}

export function saveData(req: Request, res: Response) {
  const collection = req.params.collection as string;
  const allowed = ["history", "intel", "leads", "leadHistory", "fillHistory", "formProfiles"];
  if (!allowed.includes(collection)) {
    res.status(400).json({ success: false, error: "Invalid collection" });
    return;
  }
  const { data } = req.body;
  saveStore(collection, data);
  res.json({ success: true });
}

export function deleteItem(req: Request, res: Response) {
  const role = req.headers["x-user-role"] as string;
  if (role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  const collection = req.params.collection as string;
  const id = req.params.id as string;
  const allowed = ["history", "intel", "leads", "leadHistory", "fillHistory", "formProfiles"];
  if (!allowed.includes(collection)) {
    res.status(400).json({ success: false, error: "Invalid collection" });
    return;
  }
  removeFromStore(collection, id);
  res.json({ success: true });
}

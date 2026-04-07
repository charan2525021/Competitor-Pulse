import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "store.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    name TEXT NOT NULL,
    id   TEXT,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (name, id)
  );
  CREATE TABLE IF NOT EXISTS config (
    key  TEXT PRIMARY KEY DEFAULT 'main',
    data TEXT NOT NULL
  );
`);

// Migrate existing JSON files into SQLite on first run
const COLLECTIONS = ["history", "intel", "leads", "leadHistory", "fillHistory", "formProfiles"];
for (const col of COLLECTIONS) {
  const jsonPath = path.join(DATA_DIR, `${col}.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      const rows = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (Array.isArray(rows) && rows.length > 0) {
        const existing = db.prepare("SELECT COUNT(*) as cnt FROM collections WHERE name = ?").get(col) as any;
        if (existing.cnt === 0) {
          const insert = db.prepare("INSERT OR IGNORE INTO collections (name, id, data) VALUES (?, ?, ?)");
          const tx = db.transaction(() => {
            for (const item of rows) {
              const id = item.id || item.runId || crypto.randomUUID();
              insert.run(col, id, JSON.stringify(item));
            }
          });
          tx();
          console.log(`[Store] Migrated ${rows.length} items from ${col}.json to SQLite`);
        }
      }
      // Rename the old file so it won't be re-migrated
      fs.renameSync(jsonPath, jsonPath + ".bak");
    } catch (e) {
      console.warn(`[Store] Failed to migrate ${col}.json:`, (e as Error).message);
    }
  }
}
// Migrate config.json
const cfgPath = path.join(DATA_DIR, "config.json");
if (fs.existsSync(cfgPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    const existing = db.prepare("SELECT COUNT(*) as cnt FROM config WHERE key = 'main'").get() as any;
    if (existing.cnt === 0) {
      db.prepare("INSERT INTO config (key, data) VALUES ('main', ?)").run(JSON.stringify(cfg));
      console.log("[Store] Migrated config.json to SQLite");
    }
    fs.renameSync(cfgPath, cfgPath + ".bak");
  } catch (e) {
    console.warn("[Store] Failed to migrate config.json:", (e as Error).message);
  }
}

// ── Prepared statements ──
const stmtGetAll = db.prepare("SELECT id, data FROM collections WHERE name = ? ORDER BY created_at DESC");
const stmtUpsert = db.prepare("INSERT OR REPLACE INTO collections (name, id, data) VALUES (?, ?, ?)");
const stmtDeleteOne = db.prepare("DELETE FROM collections WHERE name = ? AND id = ?");
const stmtDeleteAll = db.prepare("DELETE FROM collections WHERE name = ?");
const stmtGetCfg = db.prepare("SELECT data FROM config WHERE key = 'main'");
const stmtSetCfg = db.prepare("INSERT OR REPLACE INTO config (key, data) VALUES ('main', ?)");

export function loadStore<T>(name: string, fallback: T): T {
  try {
    const rows = stmtGetAll.all(name) as { id: string; data: string }[];
    if (rows.length === 0) return fallback;
    return rows.map((r) => JSON.parse(r.data)) as unknown as T;
  } catch (err) {
    console.warn(`[Store] Failed to load ${name}:`, (err as Error).message);
    return fallback;
  }
}

export function saveStore(name: string, data: unknown): void {
  try {
    const tx = db.transaction(() => {
      stmtDeleteAll.run(name);
      if (Array.isArray(data)) {
        for (const item of data) {
          const id = (item as any).id || (item as any).runId || crypto.randomUUID();
          stmtUpsert.run(name, id, JSON.stringify(item));
        }
      }
    });
    tx();
  } catch (err) {
    console.warn(`[Store] Failed to save ${name}:`, (err as Error).message);
  }
}

export function appendToStore<T>(name: string, item: T): void {
  try {
    const id = (item as any).id || (item as any).runId || crypto.randomUUID();
    stmtUpsert.run(name, id, JSON.stringify(item));
  } catch (err) {
    console.warn(`[Store] Failed to append to ${name}:`, (err as Error).message);
  }
}

export function removeFromStore<T extends { id?: string }>(name: string, id: string): void {
  try {
    stmtDeleteOne.run(name, id);
  } catch (err) {
    console.warn(`[Store] Failed to remove from ${name}:`, (err as Error).message);
  }
}

export function loadConfig(): any {
  try {
    const row = stmtGetCfg.get() as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  } catch (err) {
    console.warn("[Store] Failed to load config:", (err as Error).message);
    return null;
  }
}

export function saveConfig(data: unknown): void {
  try {
    stmtSetCfg.run(JSON.stringify(data));
  } catch (err) {
    console.warn("[Store] Failed to save config:", (err as Error).message);
  }
}

import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../../data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

export function loadStore<T>(name: string, fallback: T): T {
  try {
    const fp = filePath(name);
    if (!fs.existsSync(fp)) return fallback;
    const raw = fs.readFileSync(fp, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Store] Failed to load ${name}:`, (err as Error).message);
    return fallback;
  }
}

export function saveStore(name: string, data: unknown): void {
  try {
    const fp = filePath(name);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[Store] Failed to save ${name}:`, (err as Error).message);
    
  }
}

export function appendToStore<T>(name: string, item: T): void {
  const existing = loadStore<T[]>(name, []);
  existing.unshift(item);
  saveStore(name, existing);
}

export function removeFromStore<T extends { id?: string }>(name: string, id: string): void {
  const existing = loadStore<T[]>(name, []);
  const filtered = existing.filter((item) => (item as any).id !== id);
  saveStore(name, filtered);
}

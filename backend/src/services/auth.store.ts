import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = path.resolve(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "auth.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    username      TEXT NOT NULL,
    password_hash TEXT,
    role          TEXT DEFAULT 'user',
    provider      TEXT DEFAULT 'email',
    google_id     TEXT UNIQUE,
    verified      INTEGER DEFAULT 0,
    verify_token  TEXT,
    verify_expires TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
`);

export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string | null;
  role: string;
  provider: string;
  google_id: string | null;
  verified: number;
  verify_token: string | null;
  verify_expires: string | null;
  created_at: string;
  updated_at: string;
}

export function createUser(
  email: string,
  username: string,
  passwordHash: string,
): { user: UserRow; verifyToken: string } {
  const id = crypto.randomUUID();
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, verify_token, verify_expires)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase().trim(), username.trim(), passwordHash, verifyToken, verifyExpires);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
  return { user, verifyToken };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function findUserByGoogleId(googleId: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId) as UserRow | undefined;
}

export function findUserByVerifyToken(token: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE verify_token = ?").get(token) as UserRow | undefined;
}

export function verifyUser(id: string): void {
  db.prepare("UPDATE users SET verified = 1, verify_token = NULL, verify_expires = NULL, updated_at = datetime('now') WHERE id = ?").run(id);
}

export function upsertGoogleUser(email: string, username: string, googleId: string): UserRow {
  const existing = findUserByGoogleId(googleId) || findUserByEmail(email);
  if (existing) {
    if (!existing.google_id) {
      db.prepare("UPDATE users SET google_id = ?, verified = 1, provider = 'google', updated_at = datetime('now') WHERE id = ?").run(googleId, existing.id);
    }
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()) as UserRow;
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, username, google_id, provider, verified)
    VALUES (?, ?, ?, ?, 'google', 1)
  `).run(id, email.toLowerCase().trim(), username.trim(), googleId);

  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
}

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByVerifyToken,
  verifyUser,
  upsertGoogleUser,
  UserRow,
} from "../services/auth.store";

const JWT_SECRET = process.env.JWT_SECRET || "cp-secret-change-in-production";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const SALT_ROUNDS = 10;

function signToken(user: UserRow): string {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    provider: user.provider,
    verified: !!user.verified,
    createdAt: user.created_at,
  };
}

// ---------- Email helper ----------
async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@competitorpulse.ai",
    to: email,
    subject: "Verify your CompetitorPulse account",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
        <h2 style="color:#7c3aed;">Welcome to CompetitorPulse!</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px;">Or copy this link:<br/>${verifyUrl}</p>
        <p style="color:#888;font-size:12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

// ---------- Signup ----------
export async function signup(req: Request, res: Response) {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { user, verifyToken } = createUser(email, username, passwordHash);

    // Send verification email
    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (mailErr: any) {
      console.error("Failed to send verification email:", mailErr.message);
      // Still return success — user is created, just warn about email
      return res.status(201).json({
        message: "Account created. Verification email could not be sent — check SMTP settings.",
        emailSent: false,
        user: sanitizeUser(user),
      });
    }

    return res.status(201).json({
      message: "Account created! Check your email to verify.",
      emailSent: true,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// ---------- Login ----------
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.verified) {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }

    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// ---------- Verify email ----------
export async function verify(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect(`${APP_URL}?verified=error&reason=missing-token`);
    }

    const user = findUserByVerifyToken(token);
    if (!user) {
      return res.redirect(`${APP_URL}?verified=error&reason=invalid-token`);
    }

    if (user.verify_expires && new Date(user.verify_expires) < new Date()) {
      return res.redirect(`${APP_URL}?verified=error&reason=expired`);
    }

    verifyUser(user.id);
    return res.redirect(`${APP_URL}?verified=success`);
  } catch (err: any) {
    console.error("Verify error:", err);
    return res.redirect(`${APP_URL}?verified=error&reason=server-error`);
  }
}

// ---------- Resend verification ----------
export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = findUserByEmail(email);
    if (!user) return res.status(404).json({ error: "No account found with that email." });
    if (user.verified) return res.json({ message: "Email already verified." });

    // Generate new token
    const crypto = await import("crypto");
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update in DB (direct import to avoid circular)
    const Database = (await import("better-sqlite3")).default;
    const path = await import("path");
    const DB_PATH = path.join(path.resolve(__dirname, "../../data"), "auth.db");
    const db = new Database(DB_PATH);
    db.prepare("UPDATE users SET verify_token = ?, verify_expires = ? WHERE id = ?").run(verifyToken, verifyExpires, user.id);
    db.close();

    await sendVerificationEmail(email, verifyToken);
    return res.json({ message: "Verification email resent." });
  } catch (err: any) {
    console.error("Resend error:", err);
    return res.status(500).json({ error: "Failed to resend verification email." });
  }
}

// ---------- Get current user (from JWT) ----------
export async function me(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as { id: string };
    const user = findUserById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    return res.json({ user: sanitizeUser(user) });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// ---------- Google OAuth ----------
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export function googleRedirect(_req: Request, res: Response) {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
  }

  const redirectUri = `${APP_URL}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function googleCallback(req: Request, res: Response) {
  try {
    const code = req.query.code as string;
    if (!code) return res.redirect(`${APP_URL}?verified=error&reason=no-code`);

    const redirectUri = `${APP_URL}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      return res.redirect(`${APP_URL}?verified=error&reason=google-token-fail`);
    }

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo: any = await userInfoRes.json();

    if (!userInfo.email) {
      return res.redirect(`${APP_URL}?verified=error&reason=no-email`);
    }

    const user = upsertGoogleUser(userInfo.email, userInfo.name || userInfo.email.split("@")[0], userInfo.id);
    const jwtToken = signToken(user);

    // Redirect to frontend with token
    return res.redirect(`${APP_URL}?token=${jwtToken}`);
  } catch (err: any) {
    console.error("Google callback error:", err);
    return res.redirect(`${APP_URL}?verified=error&reason=server-error`);
  }
}

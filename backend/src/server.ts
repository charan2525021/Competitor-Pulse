import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import nodemailer from "nodemailer";
import agentRoutes from "./routes/agent.routes";
import leadsRoutes from "./routes/leads.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import formsRoutes from "./routes/forms.routes";
import storeRoutes from "./routes/store.routes";
import strategyRoutes from "./routes/strategy.routes";
import outreachRoutes from "./routes/outreach.routes";
import authRoutes from "./routes/auth.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/strategy", strategyRoutes);
app.use("/api/outreach", outreachRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Contact form — sends an email to the site owner
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ success: false, error: "All fields are required" });
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"CompetitorPulse Contact" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: `[CompetitorPulse] New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h2 style="color:#fff;margin:0;">⚡ New Contact Form Submission</h2>
          </div>
          <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 8px;"><strong>Name:</strong> ${name}</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
            <p style="margin:0 0 8px;"><strong>Message:</strong></p>
            <p style="margin:0;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">&copy; 2026 CompetitorPulse</p>
        </div>
      `,
    });
    console.log(`[Contact] Email sent from ${name} (${email})`);
    res.json({ success: true });
  } catch (err) {
    console.error("[Contact] Failed to send email:", err);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

export default app;

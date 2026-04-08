import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import agentRoutes from "./routes/agent.routes";
import leadsRoutes from "./routes/leads.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import formsRoutes from "./routes/forms.routes";
import storeRoutes from "./routes/store.routes";
import strategyRoutes from "./routes/strategy.routes";
import outreachRoutes from "./routes/outreach.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();

app.use(cors());
app.use(express.json());

// Routes
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

export default app;

import pool from "./index";

async function safeQuery(text: string, params: any[] = []): Promise<any> {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.warn("DB query failed (database may not be running):", (err as Error).message);
    return null;
  }
}

// === Leads ===

export async function insertLead(lead: {
  company: string;
  name: string | null;
  role: string | null;
  email: string | null;
  source: string;
}) {
  const result = await safeQuery(
    `INSERT INTO leads (company, name, role, email, source) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [lead.company, lead.name, lead.role, lead.email, lead.source]
  );
  return (result?.rows?.[0]?.id as number) ?? 0;
}

export async function checkLeadExists(company: string, email: string | null): Promise<boolean> {
  const result = await safeQuery(
    "SELECT id FROM leads WHERE company = $1 AND (email = $2 OR ($2 IS NULL AND email IS NULL))",
    [company, email]
  );
  return (result?.rows?.length ?? 0) > 0;
}

export async function updateLeadStatus(id: number, status: string) {
  await safeQuery("UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
}

export async function getLeads(params: { status?: string; limit?: number; offset?: number }) {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  values.push(limit, offset);

  const result = await safeQuery(
    `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
  const countResult = await safeQuery(
    `SELECT COUNT(*) FROM leads ${where}`,
    values.slice(0, conditions.length)
  );

  return { leads: result?.rows ?? [], total: parseInt(countResult?.rows?.[0]?.count ?? "0") };
}

// === Activities ===

export async function insertActivity(activity: {
  lead_id?: number;
  action: string;
  status: string;
  details?: Record<string, any>;
}) {
  await safeQuery(
    `INSERT INTO activities (lead_id, action, status, details) VALUES ($1, $2, $3, $4)`,
    [activity.lead_id || null, activity.action, activity.status, JSON.stringify(activity.details || {})]
  );
}

// === Dashboard ===

export async function getDashboardStats() {
  const zero = { rows: [{ count: "0" }] };
  const [leads, emails, forms, meetings] = await Promise.all([
    safeQuery("SELECT COUNT(*) FROM leads") ?? zero,
    safeQuery("SELECT COUNT(*) FROM activities WHERE action = 'email_sent' AND status = 'success'") ?? zero,
    safeQuery("SELECT COUNT(*) FROM activities WHERE action = 'form_submit' AND status = 'success'") ?? zero,
    safeQuery("SELECT COUNT(*) FROM activities WHERE action = 'meeting_booked' AND status = 'success'") ?? zero,
  ]);

  const totalActions = (await safeQuery("SELECT COUNT(*) FROM activities")) ?? zero;
  const successActions = (await safeQuery("SELECT COUNT(*) FROM activities WHERE status = 'success'")) ?? zero;

  const total = parseInt((leads ?? zero).rows?.[0]?.count ?? "0");
  const success = parseInt((successActions ?? zero).rows?.[0]?.count ?? "0");
  const totalAct = parseInt((totalActions ?? zero).rows?.[0]?.count ?? "0");

  return {
    totalLeads: total,
    emailsSent: parseInt((emails ?? zero).rows?.[0]?.count ?? "0"),
    formsSubmitted: parseInt((forms ?? zero).rows?.[0]?.count ?? "0"),
    meetingsBooked: parseInt((meetings ?? zero).rows?.[0]?.count ?? "0"),
    successRate: totalAct > 0 ? Math.round((success / totalAct) * 100) : 0,
  };
}

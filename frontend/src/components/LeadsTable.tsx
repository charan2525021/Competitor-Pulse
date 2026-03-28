interface Lead {
  id: number;
  company: string;
  name: string | null;
  role: string | null;
  email: string | null;
  source: string;
  status: string;
  created_at: string;
}

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const statusStyles: Record<string, { bg: string; text: string }> = {
    new: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
    contacted: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
    meeting_booked: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
    failed: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
  };

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
            {["Company", "Contact", "Role", "Email", "Status"].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                <span className="text-3xl block mb-2 opacity-30">📭</span>
                No leads yet
              </td>
            </tr>
          )}
          {leads.map((lead, i) => {
            const ss = statusStyles[lead.status] || statusStyles.new;
            return (
              <tr
                key={lead.id}
                className="transition-colors duration-150 animate-fade-in"
                style={{
                  animationDelay: `${i * 40}ms`,
                  borderBottom: "1px solid var(--border)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{lead.company}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{lead.name || "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{lead.role || "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{lead.email || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: ss.bg, color: ss.text }}
                  >
                    {lead.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

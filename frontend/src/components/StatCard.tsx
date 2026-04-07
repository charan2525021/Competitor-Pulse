import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color?: string;
  delay?: number;
}

export function StatCard({ label, value, icon, color = "blue", delay = 0 }: StatCardProps) {
  const colorMap: Record<string, { accent: string; shadow: string }> = {
    blue: { accent: "#6366f1", shadow: "rgba(99,102,241,0.12)" },
    green: { accent: "#22c55e", shadow: "rgba(34,197,94,0.12)" },
    purple: { accent: "#8b5cf6", shadow: "rgba(139,92,246,0.12)" },
    orange: { accent: "#f59e0b", shadow: "rgba(245,158,11,0.12)" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className="rounded-2xl p-5 animate-scale-in transition-all duration-200 hover:-translate-y-0.5 card-shimmer"
      style={{
        animationDelay: `${delay * 80}ms`,
        backgroundColor: "var(--bg-card)",
        border: "1.5px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 24px ${c.shadow}`; e.currentTarget.style.borderColor = `${c.accent}30`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.accent}10`, color: c.accent }}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs mt-1 font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

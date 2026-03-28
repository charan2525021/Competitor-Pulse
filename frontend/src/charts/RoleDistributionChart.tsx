import ReactECharts from "echarts-for-react";

interface RoleDistributionChartProps {
  data?: { name: string; value: number }[];
}

export function RoleDistributionChart({ data }: RoleDistributionChartProps) {
  const sampleData = data || [
    { name: "QA Head", value: 35 },
    { name: "VP Engineering", value: 25 },
    { name: "CTO", value: 20 },
    { name: "Eng Manager", value: 15 },
    { name: "Other", value: 5 },
  ];

  const option = {
    backgroundColor: "transparent",
    title: { text: "Role Distribution", textStyle: { color: "#e2e8f0", fontSize: 14 }, left: "center" },
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        data: sampleData,
        label: { color: "#94a3b8", fontSize: 11 },
        itemStyle: { borderColor: "#0a0a0f", borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
      },
    ],
    color: ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#6b7280"],
  };

  return <ReactECharts option={option} style={{ height: 250 }} />;
}

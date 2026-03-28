import ReactECharts from "echarts-for-react";

interface LeadsPerRunChartProps {
  data?: { run: string; count: number }[];
}

export function LeadsPerRunChart({ data }: LeadsPerRunChartProps) {
  const sampleData = data || [
    { run: "Run 1", count: 5 },
    { run: "Run 2", count: 8 },
    { run: "Run 3", count: 3 },
    { run: "Run 4", count: 12 },
    { run: "Run 5", count: 7 },
  ];

  const option = {
    backgroundColor: "transparent",
    title: { text: "Leads per Run", textStyle: { color: "#e2e8f0", fontSize: 14 }, left: "center" },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: sampleData.map((d) => d.run),
      axisLabel: { color: "#94a3b8" },
      axisLine: { lineStyle: { color: "#334155" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series: [
      {
        data: sampleData.map((d) => d.count),
        type: "bar",
        itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 250 }} />;
}

import ReactECharts from "echarts-for-react";

interface ActivityTimelineChartProps {
  data?: { date: string; actions: number }[];
}

export function ActivityTimelineChart({ data }: ActivityTimelineChartProps) {
  const sampleData = data || [
    { date: "Mon", actions: 12 },
    { date: "Tue", actions: 19 },
    { date: "Wed", actions: 8 },
    { date: "Thu", actions: 25 },
    { date: "Fri", actions: 15 },
    { date: "Sat", actions: 5 },
    { date: "Sun", actions: 2 },
  ];

  const option = {
    backgroundColor: "transparent",
    title: { text: "Activity Over Time", textStyle: { color: "#e2e8f0", fontSize: 14 }, left: "center" },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: sampleData.map((d) => d.date),
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
        data: sampleData.map((d) => d.actions),
        type: "line",
        smooth: true,
        areaStyle: { color: "rgba(59, 130, 246, 0.1)" },
        lineStyle: { color: "#3b82f6", width: 2 },
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 250 }} />;
}

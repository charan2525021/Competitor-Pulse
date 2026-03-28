import ReactECharts from "echarts-for-react";

interface SuccessRateChartProps {
  rate?: number;
}

export function SuccessRateChart({ rate = 72 }: SuccessRateChartProps) {
  const option = {
    backgroundColor: "transparent",
    title: { text: "Success Rate", textStyle: { color: "#e2e8f0", fontSize: 14 }, left: "center" },
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        progress: { show: true, width: 14, itemStyle: { color: "#22c55e" } },
        axisLine: { lineStyle: { width: 14, color: [[1, "#1e293b"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: "bold",
          color: "#e2e8f0",
          formatter: "{value}%",
          offsetCenter: [0, "10%"],
        },
        data: [{ value: rate }],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 250 }} />;
}

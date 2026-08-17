"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartSpec } from "@/lib/claude";

const COLORS = ["#b8752e", "#2f7a67", "#1c2b33", "#c9a876", "#5b6b70", "#7a4b2a"];

export default function ChartRenderer({ chart }: { chart: ChartSpec }) {
  return (
    <div
      className="w-full my-2 p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <h3 className="font-data text-xs uppercase tracking-wide mb-3" style={{ color: "var(--accent-ink)" }}>
        {chart.title}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        {chart.chartType === "line" ? (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="2 4" stroke="#ddd9cd" />
            <XAxis dataKey={chart.xKey} fontSize={11} stroke="#8b968f" />
            <YAxis fontSize={11} stroke="#8b968f" />
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chart.series.map((s, i) => (
              <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : chart.chartType === "bar" ? (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="2 4" stroke="#ddd9cd" />
            <XAxis dataKey={chart.xKey} fontSize={11} stroke="#8b968f" />
            <YAxis fontSize={11} stroke="#8b968f" />
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chart.series.map((s, i) => (
              <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <PieChart>
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Pie data={chart.data} dataKey={chart.series[0]} nameKey={chart.xKey} outerRadius={100} label>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

export type BarDatum = { label: string; value: number; color?: string };

type Common = {
  data: BarDatum[];
  dark: boolean;
  color: string;
  height?: number;
  /** Tooltip unit, e.g. "quakes" */
  unit: string;
};

function chrome(dark: boolean) {
  return {
    grid: dark ? "#1e293b" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#64748b",
    tooltip: {
      background: dark ? "#111a2e" : "#ffffff",
      border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: 8,
      fontSize: 12,
      color: dark ? "#e2e8f0" : "#0f172a",
    },
  };
}

/** Vertical columns (categories along the x axis), e.g. quakes per year. */
export function ColumnChart({ data, dark, color, height = 160, unit, ticks }: Common & { ticks?: string[] }) {
  const c = chrome(dark);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap={1}>
        <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={0.5} />
        <XAxis
          dataKey="label"
          ticks={ticks}
          tick={{ fontSize: 11, fill: c.axis }}
          tickLine={false}
          axisLine={{ stroke: c.grid }}
          interval={ticks ? 0 : "preserveStartEnd"}
        />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
          contentStyle={c.tooltip}
          formatter={(v) => [`${formatNumber(Number(v))} ${unit}`, ""]}
          separator=""
        />
        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars (categories down the y axis), e.g. top provinces. */
export function HorizontalBarChart({ data, dark, color, unit, labelWidth = 118 }: Common & { labelWidth?: number }) {
  const c = chrome(dark);
  const height = Math.max(80, data.length * 24 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barCategoryGap={4}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={{ fontSize: 11, fill: c.axis }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
          contentStyle={c.tooltip}
          formatter={(v) => [`${formatNumber(Number(v))} ${unit}`, ""]}
          separator=""
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          label={{ position: "right", fontSize: 11, fill: c.axis }}
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** "Show numbers" table under a chart, so the data is readable without the chart. */
export function ChartTable({ data, unit }: { data: BarDatum[]; unit: string }) {
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-muted">Show numbers</summary>
      <table className="mt-1 w-full">
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-border/60">
              <td className="py-0.5">{d.label}</td>
              <td className="py-0.5 text-right tabular-nums">
                {formatNumber(d.value)} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

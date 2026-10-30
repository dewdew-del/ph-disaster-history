"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateTimePH } from "@/lib/format";
import { CATEGORIES, rampColor } from "@/lib/scales";
import type { TrackPoint } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";

const dayFmt = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });

/** Wind speed over time (10-min, km/h) with the PAGASA category thresholds as dashed lines. */
export default function WindChart({ track }: { track: TrackPoint[] }) {
  const dark = useIsDark();
  const data = track.map((p) => ({ t: p[0], kmh: p[3], est: p[6] === 1, par: p[7] === 1 }));
  const hasWind = data.some((d) => d.kmh !== null);
  if (!hasWind) return <p className="text-sm text-muted">IBTrACS has no wind data for this storm.</p>;

  const axis = dark ? "#94a3b8" : "#64748b";
  const grid = dark ? "#1e293b" : "#e2e8f0";
  const max = Math.max(...data.map((d) => d.kmh ?? 0));
  const thresholds = CATEGORIES.slice(1).filter((c) => c.min <= max + 30);

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 36, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeWidth={0.5} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(t: number) => dayFmt.format(new Date(t * 1000))}
            tick={{ fontSize: 14, fill: axis }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            minTickGap={24}
          />
          <YAxis tick={{ fontSize: 14, fill: axis }} tickLine={false} axisLine={false} unit="" width={48} />
          {thresholds.map((c) => (
            <ReferenceLine
              key={c.code}
              y={c.min}
              stroke={axis}
              strokeDasharray="3 4"
              strokeWidth={0.75}
              label={{ value: c.code, position: "right", fontSize: 14, fill: axis }}
            />
          ))}
          <Tooltip
            contentStyle={{
              background: dark ? "#111a2e" : "#ffffff",
              border: `1px solid ${grid}`,
              borderRadius: 8,
              fontSize: 14,
              color: dark ? "#e2e8f0" : "#0f172a",
            }}
            labelFormatter={(t) => formatDateTimePH(Number(t))}
            formatter={(v, _n, item) => {
              const p = item?.payload as { est?: boolean; par?: boolean } | undefined;
              const extra = [p?.est ? "estimated" : "", p?.par ? "inside PAR" : ""].filter(Boolean).join(", ");
              return [v === null || v === undefined ? "no data" : `${v} km/h${extra ? ` (${extra})` : ""}`, "Wind"];
            }}
          />
          <Line
            type="monotone"
            dataKey="kmh"
            stroke={rampColor(3, dark)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted">10-minute sustained wind (km/h). Dashed lines: PAGASA category thresholds.</p>
    </div>
  );
}

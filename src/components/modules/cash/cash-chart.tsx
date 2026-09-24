"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay, type DailyRow } from "@/lib/cash";
import { formatMoney } from "@/lib/format";

/** Ingresos vs egresos por día del periodo */
export function CashChart({ daily }: { daily: DailyRow[] }) {
  const data = daily.map((d) => ({ day: formatDay(d.date), Ingresos: d.income, Egresos: d.expenses }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DF" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8A8378" }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: "#8A8378" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(62,78,58,0.06)" }}
            formatter={(v: number) => formatMoney(v)}
            contentStyle={{ borderRadius: 12, border: "1px solid #E8E5DF", fontSize: 13 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Ingresos" fill="#3E4E3A" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Egresos" fill="#D27C5A" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

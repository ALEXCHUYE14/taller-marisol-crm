"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";
import type { DashboardData } from "@/types";

const METHOD_COLORS = { Efectivo: "#3E4E3A", Yape: "#742284", Plin: "#00A5B8", Otros: "#D27C5A" };

export function IncomeChart({ data }: { data: DashboardData["incomeLast7Days"] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DF" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8A8378" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#8A8378" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(62,78,58,0.06)" }}
            formatter={(v: number) => formatMoney(v)}
            contentStyle={{ borderRadius: 12, border: "1px solid #E8E5DF", fontSize: 13 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {(Object.keys(METHOD_COLORS) as (keyof typeof METHOD_COLORS)[]).map((k, i, arr) => (
            <Bar key={k} dataKey={k} stackId="a" fill={METHOD_COLORS[k]} radius={i === arr.length - 1 ? [6, 6, 0, 0] : 0} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUS_COLORS = ["#B3AC9F", "#D9921A", "#D27C5A", "#A14F31", "#3E4E3A"];

export function OrdersFlowChart({ data }: { data: DashboardData["ordersByStatus"] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#8A8378" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="status" width={110} tick={{ fontSize: 12, fill: "#4D4841" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(62,78,58,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #E8E5DF", fontSize: 13 }} />
          <Bar dataKey="total" name="Prendas" radius={[0, 8, 8, 0]} maxBarSize={26}>
            {data.map((_, i) => (
              <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

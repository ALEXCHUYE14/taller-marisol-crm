"use client";

import { AlertTriangle, DatabaseZap } from "lucide-react";
import { formatDayLong, limaDateOf } from "@/lib/cash";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

/** Color de cada medio de pago (mismo criterio que el dashboard) */
export const METHOD_COLOR: Record<PaymentMethod, string> = {
  Efectivo: "#3E4E3A",
  Yape: "#742284",
  Plin: "#00A5B8",
  Transferencia: "#0369A1",
  Tarjeta: "#6B655B",
};

export const signedMoney = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatMoney(Math.abs(v))}`;

/** Fecha de un instante en formato "jueves, 24 de setiembre de 2026" (hora de Lima) */
export const dayHeading = (iso: string) => formatDayLong(limaDateOf(iso));

/** Aviso cuando todavía no se ejecutó supabase/caja.sql */
export function SetupNotice({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-700", className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
          <DatabaseZap className="size-5" />
        </span>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-serif text-lg font-semibold text-amber-700">Falta un paso en Supabase</p>
          <p>
            Para usar egresos, cierre de caja y saldos por cobrar hay que crear las tablas nuevas, una sola vez:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Entra a tu proyecto en <b>supabase.com</b> → <b>SQL Editor</b> → <b>New query</b>.
            </li>
            <li>
              Pega el contenido del archivo <b>supabase/caja.sql</b> y pulsa <b>Run</b>.
            </li>
            <li>Vuelve aquí y recarga la página.</li>
          </ol>
          <p className="text-xs">Es seguro: no modifica ni borra tus datos actuales.</p>
        </div>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-burgundy-50 p-3 text-sm text-burgundy">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Lista de barras horizontales proporcionales (desglose por medio o categoría) */
export function BreakdownBars({
  items,
  total,
  empty,
}: {
  items: { label: string; value: number; color: string }[];
  total: number;
  empty: string;
}) {
  const rows = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!rows.length) return <p className="rounded-xl bg-warmgray-100/70 p-4 text-center text-sm text-warmgray-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium text-warmgray-700">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-warmgray-800">{formatMoney(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-warmgray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${total > 0 ? Math.max(3, Math.min(100, (r.value / total) * 100)) : 0}%`, backgroundColor: r.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

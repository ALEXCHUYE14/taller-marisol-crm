"use client";

import { Banknote, FileSpreadsheet, FileText, Landmark, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import { METHODS, formatDayYear, type CashSummary } from "@/lib/cash";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KpiCard } from "../dashboard/kpi-card";
import { CashChart } from "./cash-chart";
import { BreakdownBars, METHOD_COLOR, signedMoney } from "./shared";
import type { PaymentMethod } from "@/types";

const CATEGORY_COLORS = ["#D27C5A", "#3E4E3A", "#D9921A", "#742284", "#0369A1", "#8B2E3C", "#7A8D6D", "#B3AC9F", "#A14F31"];

export function SummaryTab({
  summary: s,
  expensesUnavailable,
  onCsv,
  onPdf,
  exporting,
}: {
  summary: CashSummary;
  /** Aún no existe la tabla de egresos (falta caja.sql): los egresos se muestran en 0 */
  expensesUnavailable: boolean;
  onCsv: () => void;
  onPdf: () => void;
  exporting: "csv" | "pdf" | null;
}) {
  const categories = Object.entries(s.expenses.byCategory).map(([label, value], i) => ({
    label,
    value,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] ?? "#B3AC9F",
  }));
  const methods = METHODS.map((m) => ({ label: m, value: s.income.byMethod[m] ?? 0, color: METHOD_COLOR[m as PaymentMethod] }));
  const daysWithMovement = s.daily.filter((d) => d.income || d.expenses);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Ingresos"
          icon={<TrendingUp />}
          value={formatMoney(s.income.total)}
          sub={`${s.income.count} cobro(s) · sin contar garantías`}
        />
        <KpiCard
          label="Egresos"
          tone="terracotta"
          icon={<TrendingDown />}
          value={formatMoney(s.expenses.total)}
          sub={expensesUnavailable ? "Falta ejecutar caja.sql" : `${s.expenses.count} gasto(s)`}
          delay={0.05}
        />
        <KpiCard
          label="Utilidad"
          tone={s.net < 0 ? "burgundy" : "olive"}
          icon={<Scale />}
          value={<span className={cn(s.net < 0 && "text-burgundy")}>{formatMoney(s.net)}</span>}
          sub="Ingresos − egresos"
          delay={0.1}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Banknote />} title="Ingresos por medio de pago" description="Lo cobrado en el periodo" />
          <CardContent>
            <BreakdownBars items={methods} total={s.income.total} empty="Sin ingresos en este periodo" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader icon={<TrendingDown />} title="Egresos por categoría" description="En qué se gastó" />
          <CardContent>
            <BreakdownBars items={categories} total={s.expenses.total} empty="Sin egresos en este periodo" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<Landmark />}
            title="Garantías en custodia"
            description="Dinero del cliente que se devuelve: no es ingreso del taller"
          />
          <CardContent className="space-y-2 text-sm">
            <Line label="Cobradas" value={formatMoney(s.guarantees.received)} />
            <Line label="Devueltas" value={formatMoney(s.guarantees.refunded)} />
            <Line label="Neto del periodo" value={formatMoney(s.guarantees.net)} bold />
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            icon={<Banknote />}
            title="Efectivo físico"
            description="Incluye garantías cobradas y devueltas"
          />
          <CardContent className="space-y-2 text-sm">
            <Line label="Cobrado en efectivo" value={formatMoney(s.cash.in)} />
            <Line label="Pagado en efectivo" value={formatMoney(s.cash.out)} />
            <Line label="Movimiento neto" value={signedMoney(s.cash.net)} bold />
          </CardContent>
        </Card>
      </div>

      {s.daily.length > 1 && (
        <Card>
          <CardHeader title="Día por día" description="Ingresos y egresos de cada jornada" />
          <CardContent className="space-y-4">
            <CashChart daily={s.daily} />
            {daysWithMovement.length > 0 && (
              <ul className="divide-y divide-warmgray-100 rounded-xl border border-warmgray-200">
                {daysWithMovement.map((d) => (
                  <li key={d.date} className="px-3 py-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium first-letter:uppercase text-warmgray-800">{formatDayYear(d.date)}</span>
                      <span className={cn("shrink-0 font-semibold", d.net < 0 ? "text-burgundy" : "text-olive")}>{signedMoney(d.net)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-warmgray-500">
                      Ingresos {formatMoney(d.income)} · Egresos {formatMoney(d.expenses)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" loading={exporting === "csv"} onClick={onCsv}>
          <FileSpreadsheet /> Exportar a Excel
        </Button>
        <Button variant="outline" loading={exporting === "pdf"} onClick={onPdf}>
          <FileText /> Descargar PDF
        </Button>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", bold && "border-t border-warmgray-100 pt-2 font-semibold text-warmgray-800")}>
      <span className="text-warmgray-600">{label}</span>
      <span className={cn("shrink-0", bold ? "text-base" : "font-medium text-warmgray-800")}>{value}</span>
    </div>
  );
}

/** Exportación de la caja: movimientos en CSV (se abre en Excel) y resumen en PDF. */
import { formatMoney } from "@/lib/format";
import { formatDayYear, limaDateOf, limaTimeOf, periodLabel, round2, type CashSummary, type DateRange, type PeriodKind } from "@/lib/cash";
import type { IncomeRow } from "@/services";
import type { Expense } from "@/types";

export interface MovementRow {
  date: string;
  time: string;
  kind: "Ingreso" | "Garantía cobrada" | "Egreso" | "Garantía devuelta";
  concept: string;
  who: string;
  method: string;
  /** Con signo: positivo entra a la caja, negativo sale */
  amount: number;
}

/** Concepto legible de un pago: qué se cobró y a quién. */
export function incomeConcept(p: IncomeRow): { concept: string; who: string } {
  if (p.rental) {
    const item = p.rental.item ? `${p.rental.item.name} · T${p.rental.item.size}` : "Prenda";
    return { concept: `Alquiler · ${item}`, who: p.rental.client?.full_name ?? "—" };
  }
  if (p.order) {
    return { concept: `Confección N° ${p.order.order_number}${p.order.service_type ? ` · ${p.order.service_type}` : ""}`, who: p.order.client?.full_name ?? "—" };
  }
  return { concept: "Pago", who: "—" };
}

/** Une ingresos y egresos en una sola lista cronológica (más reciente primero). */
export function buildMovements(incomes: readonly IncomeRow[], expenses: readonly Expense[]): MovementRow[] {
  const rows: (MovementRow & { sort: string })[] = [];
  for (const p of incomes) {
    if (!p.created_at) continue;
    const { concept, who } = incomeConcept(p);
    const guarantee = p.payment_type === "Garantía";
    rows.push({
      sort: p.created_at,
      date: limaDateOf(p.created_at),
      time: limaTimeOf(p.created_at),
      kind: guarantee ? "Garantía cobrada" : "Ingreso",
      concept: `${concept}${p.payment_type && !guarantee ? ` (${p.payment_type})` : ""}`,
      who,
      method: p.payment_method ?? "Efectivo",
      amount: Number(p.amount),
    });
  }
  for (const e of expenses) {
    const refund = e.category === "Devolución de garantía";
    rows.push({
      sort: e.created_at ?? `${e.expense_date}T12:00:00Z`,
      date: e.expense_date,
      time: e.created_at ? limaTimeOf(e.created_at) : "",
      kind: refund ? "Garantía devuelta" : "Egreso",
      concept: `${e.category}${e.description ? ` · ${e.description}` : ""}`,
      who: "",
      method: e.payment_method,
      amount: -Number(e.amount),
    });
  }
  return rows.sort((a, b) => (a.sort < b.sort ? 1 : -1)).map(({ sort: _sort, ...row }) => row);
}

// ---------------------------------------------------------------------------
// CSV (Excel)
// ---------------------------------------------------------------------------
const csvCell = (v: string | number) => {
  const s = typeof v === "number" ? v.toFixed(2) : v;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Construye el CSV. Lleva BOM UTF-8 para que Excel muestre bien las tildes y la ñ. */
export function movementsToCsv(rows: readonly MovementRow[]): string {
  const header = ["Fecha", "Hora", "Tipo", "Concepto", "Cliente", "Medio de pago", "Monto (S/)"];
  const body = rows.map((r) => [r.date, r.time, r.kind, r.concept, r.who, r.method, round2(r.amount)]);
  return "﻿" + [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export const reportFilename = (range: DateRange, ext: string) =>
  `caja-${range.from}${range.to !== range.from ? `_a_${range.to}` : ""}.${ext}`;

export function downloadMovementsCsv(rows: readonly MovementRow[], range: DateRange) {
  saveBlob(new Blob([movementsToCsv(rows)], { type: "text/csv;charset=utf-8" }), reportFilename(range, "csv"));
}

// ---------------------------------------------------------------------------
// PDF (resumen del periodo)
// ---------------------------------------------------------------------------
export async function downloadSummaryPdf(input: {
  business: string;
  kind: PeriodKind;
  range: DateRange;
  summary: CashSummary;
  movements: readonly MovementRow[];
}) {
  const { jsPDF } = await import("jspdf");
  const { business, kind, range, summary: s, movements } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 15;
  const right = 195;
  let y = 18;

  const ensure = (h = 8) => {
    if (y + h > 282) {
      doc.addPage();
      y = 18;
    }
  };
  const title = (text: string) => {
    ensure(14);
    y += 4;
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(62, 78, 58);
    doc.text(text, left, y);
    doc.setDrawColor(200).line(left, y + 1.5, right, y + 1.5);
    y += 7;
  };
  const row = (label: string, value: string, bold = false, color: [number, number, number] = [47, 44, 40]) => {
    ensure();
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(10).setTextColor(...color);
    doc.text(label, left, y);
    doc.text(value, right, y, { align: "right" });
    y += 5.5;
  };

  doc.setFont("helvetica", "bold").setFontSize(17).setTextColor(62, 78, 58);
  doc.text("Reporte de caja", left, y);
  y += 7;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90);
  doc.text(business, left, y);
  y += 5;
  doc.text(`Periodo: ${periodLabel(kind, range)}`, left, y);
  y += 5;
  doc.text(`Generado: ${formatDayYear(limaDateOf(new Date()))} ${limaTimeOf(new Date())}`, left, y);
  y += 3;

  title("Resultado del periodo");
  row("Ingresos del taller", formatMoney(s.income.total), true);
  row("Egresos (gastos)", formatMoney(s.expenses.total), true);
  row("Utilidad", formatMoney(s.net), true, s.net < 0 ? [139, 46, 60] : [62, 78, 58]);

  title("Ingresos por medio de pago");
  for (const [m, v] of Object.entries(s.income.byMethod)) if (v) row(m, formatMoney(v));
  if (!s.income.count) row("Sin ingresos en el periodo", "");

  title("Egresos por categoría");
  const cats = Object.entries(s.expenses.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [c, v] of cats) row(c, formatMoney(v));
  if (!cats.length) row("Sin egresos en el periodo", "");

  title("Garantías (dinero en custodia, no es ingreso)");
  row("Cobradas", formatMoney(s.guarantees.received));
  row("Devueltas", formatMoney(s.guarantees.refunded));
  row("Neto del periodo", formatMoney(s.guarantees.net), true);

  title("Efectivo físico");
  row("Cobrado en efectivo (incluye garantías)", formatMoney(s.cash.in));
  row("Pagado en efectivo (incluye devoluciones)", formatMoney(s.cash.out));
  row("Movimiento neto de efectivo", formatMoney(s.cash.net), true);

  if (s.daily.length > 1) {
    title("Detalle por día");
    for (const d of s.daily) {
      if (!d.income && !d.expenses) continue;
      ensure();
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(47, 44, 40);
      doc.text(formatDayYear(d.date), left, y);
      doc.text(`Ingresos ${formatMoney(d.income)}`, 75, y);
      doc.text(`Egresos ${formatMoney(d.expenses)}`, 120, y);
      doc.text(formatMoney(d.net), right, y, { align: "right" });
      y += 5;
    }
  }

  if (movements.length) {
    title(`Movimientos (${movements.length})`);
    for (const m of movements) {
      ensure(5);
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(47, 44, 40);
      doc.text(`${m.date} ${m.time}`, left, y);
      doc.text(m.kind, 46, y);
      const text = doc.splitTextToSize(`${m.concept}${m.who ? ` - ${m.who}` : ""}`, 82)[0] ?? "";
      doc.text(text, 70, y);
      doc.text(formatMoney(m.amount), right, y, { align: "right" });
      y += 4.4;
    }
  }

  saveBlob(doc.output("blob"), reportFilename(range, "pdf"));
}

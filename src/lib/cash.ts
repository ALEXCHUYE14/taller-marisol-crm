/**
 * Lógica pura de la Caja (sin React ni Supabase): periodos, fechas de Lima y totales.
 *
 * Reglas de negocio:
 *  - Todos los cortes de día usan la hora de Perú (America/Lima, UTC-5 fijo, sin horario de verano).
 *    Un pago hecho a las 8 p. m. en Lima ya es "mañana" en UTC: por eso nunca se agrupa por fecha UTC.
 *  - Ingresos del taller = pagos que NO son garantía. La garantía es dinero en custodia que se devuelve.
 *  - Egresos operativos = gastos que NO son "Devolución de garantía".
 *  - Utilidad = ingresos del taller - egresos operativos.
 *  - Efectivo en caja = todo lo cobrado en efectivo (incluye garantías) - todo lo pagado en efectivo
 *    (incluye devoluciones de garantía).
 */
import type { ExpenseCategory, PaymentMethod, PaymentType } from "@/types";

export const LIMA_TZ = "America/Lima";
/** Perú no usa horario de verano: el desfase es siempre -05:00. */
const LIMA_OFFSET = "-05:00";
const GUARANTEE_REFUND: ExpenseCategory = "Devolución de garantía";

export const METHODS: readonly PaymentMethod[] = ["Efectivo", "Yape", "Plin", "Transferencia", "Tarjeta"];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// Fechas (siempre "YYYY-MM-DD" en hora de Lima)
// ---------------------------------------------------------------------------
const limaDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const limaTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LIMA_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Fecha de Lima ("YYYY-MM-DD") de un instante. */
export const limaDateOf = (value: Date | string) => limaDateFmt.format(typeof value === "string" ? new Date(value) : value);

/** Hoy en Lima. */
export const limaToday = (now: Date = new Date()) => limaDateOf(now);

/** Hora "HH:mm" de Lima de un instante. */
export const limaTimeOf = (value: Date | string) => limaTimeFmt.format(typeof value === "string" ? new Date(value) : value);

const toUTC = (date: string) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const addDays = (date: string, n: number) => fromUTC(toUTC(date) + n * 86_400_000);

/** Inicio (00:00 de Lima) de una fecha, como ISO UTC. */
export const limaDayStartISO = (date: string) => new Date(`${date}T00:00:00${LIMA_OFFSET}`).toISOString();

// ---------------------------------------------------------------------------
// Periodos: Hoy · Semana (lun–dom) · Quincena (1–15 / 16–fin) · Mes · Rango
// ---------------------------------------------------------------------------
export type PeriodKind = "hoy" | "semana" | "quincena" | "mes" | "rango";

/** Rango inclusivo de fechas. */
export interface DateRange {
  from: string;
  to: string;
}

export function periodRange(kind: Exclude<PeriodKind, "rango">, anchor: string): DateRange {
  const [y, m, d] = anchor.split("-").map(Number) as [number, number, number];
  switch (kind) {
    case "hoy":
      return { from: anchor, to: anchor };
    case "semana": {
      const dow = new Date(toUTC(anchor)).getUTCDay(); // 0 = domingo
      const monday = addDays(anchor, -((dow + 6) % 7));
      return { from: monday, to: addDays(monday, 6) };
    }
    case "quincena":
      return d <= 15
        ? { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-15` }
        : { from: `${y}-${pad(m)}-16`, to: `${y}-${pad(m)}-${pad(daysInMonth(y, m))}` };
    case "mes":
      return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(daysInMonth(y, m))}` };
  }
}

/** Mueve el ancla al periodo anterior (-1) o siguiente (+1). */
export function shiftAnchor(kind: Exclude<PeriodKind, "rango">, anchor: string, dir: 1 | -1): string {
  const { from, to } = periodRange(kind, anchor);
  // El día anterior al inicio cae en el periodo previo; el día posterior al fin, en el siguiente.
  return dir === -1 ? addDays(from, -1) : addDays(to, 1);
}

/** Cantidad de días de un rango (inclusivo). */
export const rangeDays = (r: DateRange) => Math.round((toUTC(r.to) - toUTC(r.from)) / 86_400_000) + 1;

export const eachDay = (r: DateRange): string[] => Array.from({ length: Math.max(0, rangeDays(r)) }, (_, i) => addDays(r.from, i));

/** Normaliza un rango libre: si el usuario puso las fechas al revés, las ordena. */
export const normalizeRange = (r: DateRange): DateRange => (r.from <= r.to ? r : { from: r.to, to: r.from });

const dayFmt = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", day: "numeric", month: "short" });
const dayYearFmt = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const longDayFmt = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const monthFmt = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "long", year: "numeric" });

const utcDate = (date: string) => new Date(toUTC(date));
const clean = (s: string) => s.replace(/\./g, "");

export const formatDay = (date: string) => clean(dayFmt.format(utcDate(date)));
export const formatDayYear = (date: string) => clean(dayYearFmt.format(utcDate(date)));
export const formatDayLong = (date: string) => longDayFmt.format(utcDate(date));

export function periodLabel(kind: PeriodKind, r: DateRange): string {
  switch (kind) {
    case "hoy":
      return formatDayLong(r.from);
    case "mes":
      return monthFmt.format(utcDate(r.from));
    case "quincena": {
      const first = Number(r.from.slice(8)) === 1;
      return `${first ? "1.ª" : "2.ª"} quincena de ${monthFmt.format(utcDate(r.from))} (${Number(r.from.slice(8))}–${Number(r.to.slice(8))})`;
    }
    default:
      if (r.from === r.to) return formatDayYear(r.from);
      // Mismo mes: "21 – 27 set 2026"; distinto mes: "29 set – 5 oct 2026"
      return r.from.slice(0, 7) === r.to.slice(0, 7)
        ? `${Number(r.from.slice(8))} – ${formatDayYear(r.to)}`
        : `${formatDay(r.from)} – ${formatDayYear(r.to)}`;
  }
}

// ---------------------------------------------------------------------------
// Totales
// ---------------------------------------------------------------------------
export interface PaymentLike {
  created_at: string | null;
  amount: number | string;
  payment_method: PaymentMethod | null;
  payment_type: PaymentType | null;
}
export interface ExpenseLike {
  expense_date: string;
  category: ExpenseCategory;
  amount: number | string;
  payment_method: PaymentMethod | null;
}

export interface DailyRow {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CashSummary {
  /** Ingresos del taller (sin garantías) */
  income: { total: number; count: number; byMethod: Record<string, number>; byType: Record<string, number> };
  /** Garantías en custodia: cobradas, devueltas y neto del periodo */
  guarantees: { received: number; refunded: number; net: number; receivedCount: number };
  /** Egresos operativos (sin devolución de garantías) */
  expenses: { total: number; count: number; byCategory: Record<string, number>; byMethod: Record<string, number> };
  /** Todo lo cobrado (incluye garantías) por medio de pago */
  collectedByMethod: Record<string, number>;
  /** Utilidad = ingresos - egresos operativos */
  net: number;
  /** Movimiento de efectivo físico (incluye garantías y devoluciones) */
  cash: { in: number; out: number; net: number };
  daily: DailyRow[];
}

const emptyByMethod = () => Object.fromEntries(METHODS.map((m) => [m, 0])) as Record<string, number>;

export function summarize(range: DateRange, payments: readonly PaymentLike[], expenses: readonly ExpenseLike[]): CashSummary {
  const income = { total: 0, count: 0, byMethod: emptyByMethod(), byType: {} as Record<string, number> };
  const guarantees = { received: 0, refunded: 0, net: 0, receivedCount: 0 };
  const exp = { total: 0, count: 0, byCategory: {} as Record<string, number>, byMethod: emptyByMethod() };
  const collectedByMethod = emptyByMethod();
  const cash = { in: 0, out: 0, net: 0 };

  const days = new Map<string, DailyRow>(eachDay(range).map((date) => [date, { date, income: 0, expenses: 0, net: 0 }]));

  for (const p of payments) {
    if (!p.created_at) continue;
    const day = limaDateOf(p.created_at);
    const row = days.get(day);
    if (!row) continue; // fuera del rango
    const amount = Number(p.amount) || 0;
    const method = p.payment_method ?? "Efectivo";

    collectedByMethod[method] = (collectedByMethod[method] ?? 0) + amount;
    if (method === "Efectivo") cash.in += amount;

    if (p.payment_type === "Garantía") {
      guarantees.received += amount;
      guarantees.receivedCount += 1;
    } else {
      income.total += amount;
      income.count += 1;
      income.byMethod[method] = (income.byMethod[method] ?? 0) + amount;
      const type = p.payment_type ?? "Otro";
      income.byType[type] = (income.byType[type] ?? 0) + amount;
      row.income += amount;
    }
  }

  for (const e of expenses) {
    const row = days.get(e.expense_date);
    if (!row) continue;
    const amount = Number(e.amount) || 0;
    const method = e.payment_method ?? "Efectivo";
    if (method === "Efectivo") cash.out += amount;

    if (e.category === GUARANTEE_REFUND) {
      guarantees.refunded += amount;
    } else {
      exp.total += amount;
      exp.count += 1;
      exp.byCategory[e.category] = (exp.byCategory[e.category] ?? 0) + amount;
      exp.byMethod[method] = (exp.byMethod[method] ?? 0) + amount;
      row.expenses += amount;
    }
  }

  guarantees.net = guarantees.received - guarantees.refunded;
  cash.net = cash.in - cash.out;

  const r2 = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, round2(v)]));
  const daily = [...days.values()].map((d) => ({
    date: d.date,
    income: round2(d.income),
    expenses: round2(d.expenses),
    net: round2(d.income - d.expenses),
  }));

  return {
    income: { total: round2(income.total), count: income.count, byMethod: r2(income.byMethod), byType: r2(income.byType) },
    guarantees: {
      received: round2(guarantees.received),
      refunded: round2(guarantees.refunded),
      net: round2(guarantees.net),
      receivedCount: guarantees.receivedCount,
    },
    expenses: { total: round2(exp.total), count: exp.count, byCategory: r2(exp.byCategory), byMethod: r2(exp.byMethod) },
    collectedByMethod: r2(collectedByMethod),
    net: round2(income.total - exp.total),
    cash: { in: round2(cash.in), out: round2(cash.out), net: round2(cash.net) },
    daily,
  };
}

// ---------------------------------------------------------------------------
// Cierre de caja (un día)
// ---------------------------------------------------------------------------
export interface DayTotals {
  incomeTotal: number;
  guaranteesIn: number;
  expensesTotal: number;
  guaranteesOut: number;
  cashIn: number;
  cashOut: number;
  byMethod: Record<string, number>;
}

/** Totales de un solo día (base del cierre). */
export function dayTotals(date: string, payments: readonly PaymentLike[], expenses: readonly ExpenseLike[]): DayTotals {
  const s = summarize({ from: date, to: date }, payments, expenses);
  return {
    incomeTotal: s.income.total,
    guaranteesIn: s.guarantees.received,
    expensesTotal: s.expenses.total,
    guaranteesOut: s.guarantees.refunded,
    cashIn: s.cash.in,
    cashOut: s.cash.out,
    byMethod: s.collectedByMethod,
  };
}

/** Efectivo que debería haber en la caja: fondo inicial + cobrado en efectivo - pagado en efectivo. */
export const expectedCash = (opening: number, t: Pick<DayTotals, "cashIn" | "cashOut">) =>
  round2(opening + t.cashIn - t.cashOut);

/** Diferencia = contado - esperado. Positivo = sobra, negativo = falta. */
export const cashDifference = (counted: number, expected: number) => round2(counted - expected);

export interface ClosingSnapshot {
  income_total: number | string;
  guarantees_in: number | string;
  expenses_total: number | string;
  guarantees_out: number | string;
  cash_in: number | string;
  cash_out: number | string;
}

const DRIFT_FIELDS: { snap: keyof ClosingSnapshot; live: keyof DayTotals; label: string }[] = [
  { snap: "income_total", live: "incomeTotal", label: "Ingresos" },
  { snap: "guarantees_in", live: "guaranteesIn", label: "Garantías cobradas" },
  { snap: "expenses_total", live: "expensesTotal", label: "Egresos" },
  { snap: "guarantees_out", live: "guaranteesOut", label: "Garantías devueltas" },
  { snap: "cash_in", live: "cashIn", label: "Efectivo cobrado" },
  { snap: "cash_out", live: "cashOut", label: "Efectivo pagado" },
];

/** Diferencias entre lo guardado en el cierre y lo que hay hoy (movimientos hechos después de cerrar). */
export function closingDrift(snapshot: ClosingSnapshot, live: DayTotals) {
  return DRIFT_FIELDS.map((f) => ({ label: f.label, diff: round2(Number(live[f.live]) - Number(snapshot[f.snap])) })).filter(
    (d) => Math.abs(d.diff) > 0.005,
  );
}

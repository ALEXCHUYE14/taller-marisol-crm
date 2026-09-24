import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

export const formatMoney = (value: number | null | undefined) => currency.format(Number(value ?? 0));

/** Fecha local YYYY-MM-DD (sin desfase UTC) */
export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const addDaysISO = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
};

/** Para columnas DATE ("2026-09-24") evitamos el parseo en UTC */
const parseDate = (value: string) => (value.length <= 10 ? parseISO(`${value}T12:00:00`) : parseISO(value));

export const formatDate = (value: string | null | undefined, pattern = "dd MMM yyyy") =>
  value ? format(parseDate(value), pattern, { locale: es }) : "—";

export const formatDateLong = (value: string | null | undefined) =>
  value ? format(parseDate(value), "EEEE d 'de' MMMM", { locale: es }) : "—";

export const formatDateTime = (value: string | null | undefined) =>
  value ? format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: es }) : "—";

/** Días desde hoy hasta la fecha (negativo = vencido) */
export const daysUntil = (value: string) => differenceInCalendarDays(parseDate(value), new Date());

export const relativeDayLabel = (value: string) => {
  const d = daysUntil(value);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  if (d < 0) return `Hace ${Math.abs(d)} días`;
  return `En ${d} días`;
};

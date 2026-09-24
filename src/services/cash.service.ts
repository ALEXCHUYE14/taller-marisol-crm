import { getSupabase } from "@/lib/supabase/client";
import { addDays, dayTotals, expectedCash, limaDayStartISO, limaToday, round2, type DateRange } from "@/lib/cash";
import type { CashClosing, Payment, Receivable } from "@/types";
import { expensesService } from "./expenses.service";
import { fetchAllPages } from "./pagination";

const INCOME_SELECT =
  "*, rental:rentals(client:clients(full_name), item:rentals_inventory(name, size)), order:tailoring_orders(order_number, service_type, client:clients(full_name))";

/** Pago con el cliente y el concepto (alquiler o confección) al que corresponde. */
export interface IncomeRow extends Payment {
  rental: { client: { full_name: string } | null; item: { name: string; size: string } | null } | null;
  order: { order_number: number; service_type: string | null; client: { full_name: string } | null } | null;
}

/** ¿El error indica que aún no se ejecutó supabase/caja.sql? */
export function isMissingCajaSetup(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "42P01" || // tabla no existe (Postgres)
    code === "PGRST205" || // tabla no está en el schema cache (PostgREST)
    /schema cache|does not exist|Could not find the table/i.test(message ?? "")
  );
}

export const cashService = {
  /** Pagos cobrados en un rango de fechas de Lima (inclusivo), del más reciente al más antiguo. */
  async incomes(range: DateRange): Promise<IncomeRow[]> {
    const from = limaDayStartISO(range.from);
    const toExclusive = limaDayStartISO(addDays(range.to, 1));
    return fetchAllPages<IncomeRow>((start, end) =>
      getSupabase()
        .from("payments")
        .select(INCOME_SELECT)
        .gte("created_at", from)
        .lt("created_at", toExclusive)
        .order("created_at", { ascending: false })
        .order("id")
        .range(start, end),
    );
  },

  async getClosing(date: string): Promise<CashClosing | null> {
    const { data, error } = await getSupabase().from("cash_closings").select("*").eq("closing_date", date).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Último cierre anterior a una fecha (su efectivo contado sugiere el fondo inicial del día siguiente). */
  async previousClosing(before: string): Promise<CashClosing | null> {
    const { data, error } = await getSupabase()
      .from("cash_closings")
      .select("*")
      .lt("closing_date", before)
      .order("closing_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listClosings(limit = 30): Promise<CashClosing[]> {
    const { data, error } = await getSupabase()
      .from("cash_closings")
      .select("*")
      .order("closing_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  /**
   * Cierra un día. Recalcula los totales con datos frescos de la base (no con los de la pantalla) y, si
   * cambiaron mientras el usuario contaba, se detiene para que confirme de nuevo con los montos correctos.
   */
  async closeDay(input: {
    date: string;
    openingCash: number;
    countedCash: number;
    expectedSeen: number;
    notes?: string;
  }): Promise<CashClosing> {
    if (input.date > limaToday()) throw new Error("No se puede cerrar un día futuro");
    if (!(input.countedCash >= 0) || !(input.openingCash >= 0)) throw new Error("Los montos no pueden ser negativos");

    const range = { from: input.date, to: input.date };
    const [payments, expenses] = await Promise.all([cashService.incomes(range), expensesService.list(range)]);
    const totals = dayTotals(input.date, payments, expenses);
    const expected = expectedCash(input.openingCash, totals);

    if (Math.abs(expected - input.expectedSeen) > 0.005) {
      throw new Error("Se registraron movimientos nuevos mientras contabas. Revisa los montos y confirma otra vez.");
    }

    const { data, error } = await getSupabase()
      .from("cash_closings")
      .insert({
        closing_date: input.date,
        opening_cash: round2(input.openingCash),
        income_total: totals.incomeTotal,
        guarantees_in: totals.guaranteesIn,
        expenses_total: totals.expensesTotal,
        guarantees_out: totals.guaranteesOut,
        cash_in: totals.cashIn,
        cash_out: totals.cashOut,
        expected_cash: expected,
        counted_cash: round2(input.countedCash),
        by_method: totals.byMethod,
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505") throw new Error("Ese día ya tiene cierre de caja");
      throw error;
    }
    return data;
  },

  /** Reabre un día (borra su cierre). Permite volver a editar los egresos de esa fecha. */
  async reopenDay(id: string): Promise<void> {
    const { error } = await getSupabase().from("cash_closings").delete().eq("id", id);
    if (error) throw error;
  },

  /** Alquileres y confecciones con saldo pendiente, ordenados por fecha de vencimiento. */
  async receivables(): Promise<Receivable[]> {
    return fetchAllPages<Receivable>((from, to) =>
      getSupabase()
        .from("receivables")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("id")
        .range(from, to),
    );
  },
};

import { format, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase/client";
import { addDaysISO, todayISO } from "@/lib/format";
import type { DashboardData, Payment, RentalWithRelations, TailoringOrderWithClient } from "@/types";
import { TAILORING_STATUSES } from "@/types";
import { rentalsService } from "./rentals.service";

const RENTAL_SELECT =
  "*, client:clients(id, full_name, phone), item:rentals_inventory(id, code, name, size, color, images, category)";

export const dashboardService = {
  async get(): Promise<DashboardData> {
    const supabase = getSupabase();
    await rentalsService.markOverdue();

    const today = todayISO();
    const tomorrow = addDaysISO(1);
    const startToday = startOfDay(new Date());
    const start7 = startOfDay(subDays(new Date(), 6));

    const [due, overdue, ordersActive, payments, inventory] = await Promise.all([
      supabase
        .from("rentals")
        .select(RENTAL_SELECT)
        .eq("status", "Entregado")
        .gte("return_date", today)
        .lte("return_date", tomorrow)
        .order("return_date"),
      supabase.from("rentals").select(RENTAL_SELECT).eq("status", "Con Retraso").order("return_date"),
      supabase
        .from("tailoring_orders")
        .select("*, client:clients(id, full_name, phone, measures)")
        .neq("status", "Entregado")
        .order("delivery_date"),
      supabase.from("payments").select("*").gte("created_at", start7.toISOString()),
      supabase.from("rentals_inventory").select("status"),
    ]);

    for (const r of [due, overdue, ordersActive, payments, inventory]) if (r.error) throw r.error;

    const orders = (ordersActive.data ?? []) as unknown as TailoringOrderWithClient[];
    const paymentRows = (payments.data ?? []) as Payment[];

    // Caja del día
    const todays = paymentRows.filter((p) => p.created_at && new Date(p.created_at) >= startToday);
    const byMethod: Record<string, number> = { Efectivo: 0, Yape: 0, Plin: 0, Transferencia: 0, Tarjeta: 0 };
    for (const p of todays) {
      const key = p.payment_method ?? "Efectivo";
      byMethod[key] = (byMethod[key] ?? 0) + Number(p.amount);
    }

    // Ingresos de los últimos 7 días por método
    const incomeLast7Days = Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(subDays(new Date(), 6 - i));
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const bucket = { day: format(day, "EEE d", { locale: es }), Efectivo: 0, Yape: 0, Plin: 0, Otros: 0 };
      for (const p of paymentRows) {
        if (!p.created_at) continue;
        const t = new Date(p.created_at);
        if (t < day || t >= next) continue;
        const amount = Number(p.amount);
        if (p.payment_method === "Efectivo") bucket.Efectivo += amount;
        else if (p.payment_method === "Yape") bucket.Yape += amount;
        else if (p.payment_method === "Plin") bucket.Plin += amount;
        else bucket.Otros += amount;
      }
      return bucket;
    });

    const ordersByStatus = TAILORING_STATUSES.filter((s) => s !== "Entregado").map((status) => ({
      status,
      total: orders.filter((o) => o.status === status).length,
    }));

    const inv = inventory.data ?? [];

    return {
      rentalsDue: (due.data ?? []) as unknown as RentalWithRelations[],
      rentalsOverdue: (overdue.data ?? []) as unknown as RentalWithRelations[],
      ordersDueToday: orders.filter((o) => o.delivery_date === today && o.status !== "Listo para Entregar"),
      ordersLate: orders.filter((o) => o.delivery_date < today && o.status !== "Listo para Entregar"),
      cash: { total: todays.reduce((s, p) => s + Number(p.amount), 0), byMethod, count: todays.length },
      incomeLast7Days,
      ordersByStatus,
      inventoryAvailable: inv.filter((i) => i.status === "Disponible").length,
      inventoryTotal: inv.filter((i) => i.status !== "Baja").length,
    };
  },
};

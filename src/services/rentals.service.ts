import { getSupabase } from "@/lib/supabase/client";
import type { GuaranteeStatus, PaymentMethod, RentalStatus, RentalWithRelations } from "@/types";
import type { RentalFormValues } from "@/lib/validations";
import { paymentsService } from "./payments.service";

const SELECT =
  "*, client:clients(id, full_name, phone), item:rentals_inventory(id, code, name, size, color, images, category)";

export type RentalListFilter = "activos" | "por-vencer" | "vencidos" | "historial" | "todos";

export const rentalsService = {
  async list(filter: RentalListFilter = "activos"): Promise<RentalWithRelations[]> {
    let query = getSupabase().from("rentals").select(SELECT);
    switch (filter) {
      case "activos":
        query = query.in("status", ["Reservado", "Entregado", "Con Retraso"]).order("return_date", { ascending: true });
        break;
      case "por-vencer":
        query = query.in("status", ["Entregado"]).order("return_date", { ascending: true });
        break;
      case "vencidos":
        query = query.eq("status", "Con Retraso").order("return_date", { ascending: true });
        break;
      case "historial":
        query = query.in("status", ["Devuelto", "Cancelado"]).order("return_date", { ascending: false }).limit(200);
        break;
      default:
        query = query.order("created_at", { ascending: false }).limit(300);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as RentalWithRelations[];
  },

  async get(id: string): Promise<RentalWithRelations> {
    const { data, error } = await getSupabase().from("rentals").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return data as unknown as RentalWithRelations;
  },

  /**
   * Flujo de salida de prenda: crea el contrato y registra los pagos
   * (alquiler + garantía) en el historial de caja.
   */
  async create(values: RentalFormValues): Promise<RentalWithRelations> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("rentals")
      .insert({
        client_id: values.client_id,
        inventory_id: values.inventory_id,
        pickup_date: values.pickup_date,
        return_date: values.return_date,
        total_amount: values.total_amount,
        deposit_amount: values.deposit_amount,
        guarantee_status: "Retenida",
        status: values.deliver_now ? "Entregado" : "Reservado",
        notes: values.notes?.trim() || null,
      })
      .select(SELECT)
      .single();
    if (error) throw error;

    const rental = data as unknown as RentalWithRelations;
    const reference = values.reference_code?.trim() || null;

    if (values.paid_now > 0) {
      await paymentsService.create({
        rental_id: rental.id,
        amount: values.paid_now,
        payment_method: values.payment_method,
        payment_type: values.paid_now >= values.total_amount ? "Pago Total" : "Adelanto",
        reference_code: reference,
      });
    }
    if (values.deposit_amount > 0 && values.deliver_now) {
      await paymentsService.create({
        rental_id: rental.id,
        amount: values.deposit_amount,
        payment_method: values.payment_method,
        payment_type: "Garantía",
        reference_code: reference,
      });
    }
    return rental;
  },

  async setStatus(id: string, status: RentalStatus): Promise<void> {
    const { error } = await getSupabase().from("rentals").update({ status }).eq("id", id);
    if (error) throw error;
  },

  /** Entrega al cliente (Reservado → Entregado). Cobra saldo y garantía si corresponde. */
  async deliver(
    rental: RentalWithRelations,
    opts: { balance: number; guarantee: number; method: PaymentMethod; reference?: string },
  ): Promise<void> {
    await rentalsService.setStatus(rental.id, "Entregado");
    const reference = opts.reference?.trim() || null;
    if (opts.balance > 0)
      await paymentsService.create({
        rental_id: rental.id,
        amount: opts.balance,
        payment_method: opts.method,
        payment_type: "Liquidación Saldo",
        reference_code: reference,
      });
    if (opts.guarantee > 0)
      await paymentsService.create({
        rental_id: rental.id,
        amount: opts.guarantee,
        payment_method: opts.method,
        payment_type: "Garantía",
        reference_code: reference,
      });
  },

  /** Recepción de la prenda devuelta; define qué pasa con la garantía. */
  async markReturned(id: string, guarantee: GuaranteeStatus, notes?: string): Promise<void> {
    const { error } = await getSupabase()
      .from("rentals")
      .update({ status: "Devuelto", guarantee_status: guarantee, ...(notes ? { notes } : {}) })
      .eq("id", id);
    if (error) throw error;
  },

  async cancel(id: string): Promise<void> {
    await rentalsService.setStatus(id, "Cancelado");
  },

  /** Marca como "Con Retraso" los contratos vencidos (función SQL). */
  async markOverdue(): Promise<number> {
    const { data, error } = await getSupabase().rpc("mark_overdue_rentals");
    if (error) {
      console.warn("[rentals] mark_overdue_rentals:", error.message);
      return 0;
    }
    return data ?? 0;
  },
};

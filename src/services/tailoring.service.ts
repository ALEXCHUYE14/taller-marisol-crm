import { getSupabase } from "@/lib/supabase/client";
import { addDaysISO } from "@/lib/format";
import type { PaymentMethod, TailoringOrder, TailoringOrderWithClient, TailoringStatus } from "@/types";
import type { TailoringFormValues } from "@/lib/validations";
import { paymentsService } from "./payments.service";
import { storageService } from "./storage.service";

const SELECT = "*, client:clients(id, full_name, phone, measures)";

const cleanMeasures = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).filter(([, v]) => v && v.trim() !== ""));

export const tailoringService = {
  async list(options: { includeDelivered?: boolean } = {}): Promise<TailoringOrderWithClient[]> {
    let query = getSupabase().from("tailoring_orders").select(SELECT).order("delivery_date", { ascending: true });
    if (!options.includeDelivered) {
      // Entregados solo de los últimos 30 días para no saturar el tablero
      query = query.or(`status.neq.Entregado,delivery_date.gte.${addDaysISO(-30)}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as TailoringOrderWithClient[];
  },

  async get(id: string): Promise<TailoringOrderWithClient> {
    const { data, error } = await getSupabase().from("tailoring_orders").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return data as unknown as TailoringOrderWithClient;
  },

  async create(values: TailoringFormValues, files: File[] = []): Promise<TailoringOrderWithClient> {
    const images = files.length
      ? await storageService.uploadMany("tailoring-references", files, `cliente-${values.client_id.slice(0, 8)}`)
      : [];
    const { data, error } = await getSupabase()
      .from("tailoring_orders")
      .insert({
        client_id: values.client_id,
        service_type: values.service_type,
        garment_description: values.garment_description.trim(),
        delivery_date: values.delivery_date,
        status: values.status,
        total_price: values.total_price,
        advance_payment: values.advance_payment,
        specific_measures: cleanMeasures(values.specific_measures),
        reference_images: images,
      })
      .select(SELECT)
      .single();
    if (error) {
      await storageService.removeByUrls("tailoring-references", images);
      throw error;
    }
    const order = data as unknown as TailoringOrderWithClient;
    if (values.advance_payment > 0) {
      await paymentsService.create({
        order_id: order.id,
        amount: values.advance_payment,
        payment_method: values.payment_method,
        payment_type: values.advance_payment >= values.total_price ? "Pago Total" : "Adelanto",
      });
    }
    return order;
  },

  async update(
    order: TailoringOrder,
    values: Omit<TailoringFormValues, "advance_payment" | "payment_method">,
    newFiles: File[] = [],
    removedImages: string[] = [],
  ): Promise<void> {
    const uploaded = newFiles.length
      ? await storageService.uploadMany("tailoring-references", newFiles, `orden-${order.order_number}`)
      : [];
    const images = [...(order.reference_images ?? []).filter((u) => !removedImages.includes(u)), ...uploaded];
    const { error } = await getSupabase()
      .from("tailoring_orders")
      .update({
        client_id: values.client_id,
        service_type: values.service_type,
        garment_description: values.garment_description.trim(),
        delivery_date: values.delivery_date,
        status: values.status,
        total_price: values.total_price,
        specific_measures: cleanMeasures(values.specific_measures),
        reference_images: images,
      })
      .eq("id", order.id);
    if (error) {
      await storageService.removeByUrls("tailoring-references", uploaded);
      throw error;
    }
    await storageService.removeByUrls("tailoring-references", removedImages);
  },

  async setStatus(id: string, status: TailoringStatus): Promise<void> {
    const { error } = await getSupabase().from("tailoring_orders").update({ status }).eq("id", id);
    if (error) throw error;
  },

  /** Registra un pago parcial o la liquidación del saldo pendiente. */
  async addPayment(order: TailoringOrder, amount: number, method: PaymentMethod, reference?: string): Promise<void> {
    const paid = Number(order.advance_payment ?? 0) + amount;
    if (paid > Number(order.total_price) + 0.001) throw new Error("El pago supera el saldo pendiente");
    const { error } = await getSupabase().from("tailoring_orders").update({ advance_payment: paid }).eq("id", order.id);
    if (error) throw error;
    await paymentsService.create({
      order_id: order.id,
      amount,
      payment_method: method,
      payment_type: paid >= Number(order.total_price) ? "Liquidación Saldo" : "Adelanto",
      reference_code: reference?.trim() || null,
    });
  },

  async remove(order: TailoringOrder): Promise<void> {
    const { error } = await getSupabase().from("tailoring_orders").delete().eq("id", order.id);
    if (error) throw error;
    await storageService.removeByUrls("tailoring-references", order.reference_images ?? []);
  },
};

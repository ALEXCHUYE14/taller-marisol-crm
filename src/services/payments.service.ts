import { getSupabase } from "@/lib/supabase/client";
import type { Payment, PaymentInsert } from "@/types";

export const paymentsService = {
  async create(payment: PaymentInsert): Promise<Payment> {
    const { data, error } = await getSupabase().from("payments").insert(payment).select("*").single();
    if (error) throw error;
    return data;
  },

  /** Pagos entre dos instantes ISO (incluye inicio, excluye fin) */
  async listBetween(fromISO: string, toISO: string): Promise<Payment[]> {
    const { data, error } = await getSupabase()
      .from("payments")
      .select("*")
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async listRecent(limit = 20): Promise<Payment[]> {
    const { data, error } = await getSupabase()
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async byRental(rentalId: string): Promise<Payment[]> {
    const { data, error } = await getSupabase()
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .order("created_at");
    if (error) throw error;
    return data;
  },

  async byOrder(orderId: string): Promise<Payment[]> {
    const { data, error } = await getSupabase()
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");
    if (error) throw error;
    return data;
  },
};

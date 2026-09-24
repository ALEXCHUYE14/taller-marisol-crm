import { getSupabase } from "@/lib/supabase/client";
import type { Client, Measures, RentalWithRelations, TailoringOrder } from "@/types";
import { EMPTY_MEASURES } from "@/types";
import type { ClientFormValues, QuickClientFormValues } from "@/lib/validations";

const nullIfEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const normalizeMeasures = (m: Partial<Measures> | null | undefined): Measures => ({
  ...EMPTY_MEASURES,
  ...(m ?? {}),
});

export const clientsService = {
  async list(search?: string): Promise<Client[]> {
    let query = getSupabase().from("clients").select("*").order("full_name", { ascending: true }).limit(300);
    const term = search?.trim().replace(/[%,()]/g, "");
    if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,dni.ilike.%${term}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async get(id: string): Promise<Client> {
    const { data, error } = await getSupabase().from("clients").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async create(values: ClientFormValues | QuickClientFormValues): Promise<Client> {
    const full = values as Partial<ClientFormValues>;
    const { data, error } = await getSupabase()
      .from("clients")
      .insert({
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        dni: nullIfEmpty(values.dni),
        email: nullIfEmpty(full.email),
        address: nullIfEmpty(full.address),
        notes: nullIfEmpty(full.notes),
        measures: normalizeMeasures(full.measures),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, values: ClientFormValues): Promise<Client> {
    const { data, error } = await getSupabase()
      .from("clients")
      .update({
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        dni: nullIfEmpty(values.dni),
        email: nullIfEmpty(values.email),
        address: nullIfEmpty(values.address),
        notes: nullIfEmpty(values.notes),
        measures: normalizeMeasures(values.measures),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updateMeasures(id: string, measures: Measures): Promise<void> {
    const { error } = await getSupabase().from("clients").update({ measures }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from("clients").delete().eq("id", id);
    if (error) throw error;
  },

  /** Historial del cliente: alquileres y confecciones */
  async history(id: string): Promise<{ rentals: RentalWithRelations[]; orders: TailoringOrder[] }> {
    const supabase = getSupabase();
    const [rentals, orders] = await Promise.all([
      supabase
        .from("rentals")
        .select("*, client:clients(id, full_name, phone), item:rentals_inventory(id, code, name, size, color, images, category)")
        .eq("client_id", id)
        .order("pickup_date", { ascending: false }),
      supabase.from("tailoring_orders").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    if (rentals.error) throw rentals.error;
    if (orders.error) throw orders.error;
    return { rentals: rentals.data as unknown as RentalWithRelations[], orders: orders.data };
  },
};

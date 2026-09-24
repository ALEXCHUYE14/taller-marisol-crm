import { getSupabase } from "@/lib/supabase/client";
import type { InventoryCategory, InventoryItem, InventoryStatus } from "@/types";
import type { InventoryFormValues } from "@/lib/validations";
import { storageService } from "./storage.service";

export interface InventoryFilters {
  search?: string;
  category?: InventoryCategory | "";
  size?: string;
  color?: string;
  status?: InventoryStatus | "";
}

const nullIfEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const inventoryService = {
  async list(filters: InventoryFilters = {}): Promise<InventoryItem[]> {
    let query = getSupabase().from("rentals_inventory").select("*").order("code", { ascending: true });
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.size) query = query.ilike("size", filters.size);
    if (filters.color) query = query.ilike("color", `%${filters.color}%`);
    const term = filters.search?.trim().replace(/[%,()]/g, "");
    if (term) query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /** Prendas que pueden alquilarse ahora */
  async listAvailable(): Promise<InventoryItem[]> {
    const { data, error } = await getSupabase()
      .from("rentals_inventory")
      .select("*")
      .eq("status", "Disponible")
      .order("name");
    if (error) throw error;
    return data;
  },

  /** Valores distintos de talla y color para los filtros rápidos */
  async facets(): Promise<{ sizes: string[]; colors: string[] }> {
    const { data, error } = await getSupabase().from("rentals_inventory").select("size, color");
    if (error) throw error;
    const sizes = Array.from(new Set(data.map((d) => d.size).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true }),
    );
    const colors = Array.from(new Set(data.map((d) => d.color).filter((c): c is string => Boolean(c)))).sort();
    return { sizes, colors };
  },

  async create(values: InventoryFormValues, files: File[] = []): Promise<InventoryItem> {
    const images = files.length ? await storageService.uploadMany("rentals-gallery", files, values.code) : [];
    const { data, error } = await getSupabase()
      .from("rentals_inventory")
      .insert({ ...values, color: nullIfEmpty(values.color), code: values.code.toUpperCase(), images })
      .select("*")
      .single();
    if (error) {
      await storageService.removeByUrls("rentals-gallery", images);
      if (error.code === "23505") throw new Error(`Ya existe una prenda con el código ${values.code.toUpperCase()}`);
      throw error;
    }
    return data;
  },

  async update(
    item: InventoryItem,
    values: InventoryFormValues,
    newFiles: File[] = [],
    removedImages: string[] = [],
  ): Promise<InventoryItem> {
    const uploaded = newFiles.length ? await storageService.uploadMany("rentals-gallery", newFiles, values.code) : [];
    const images = [...(item.images ?? []).filter((u) => !removedImages.includes(u)), ...uploaded];
    const { data, error } = await getSupabase()
      .from("rentals_inventory")
      .update({ ...values, color: nullIfEmpty(values.color), code: values.code.toUpperCase(), images })
      .eq("id", item.id)
      .select("*")
      .single();
    if (error) {
      await storageService.removeByUrls("rentals-gallery", uploaded);
      throw error;
    }
    await storageService.removeByUrls("rentals-gallery", removedImages);
    return data;
  },

  async setStatus(id: string, status: InventoryStatus): Promise<void> {
    const { error } = await getSupabase().from("rentals_inventory").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async remove(item: InventoryItem): Promise<void> {
    const { error } = await getSupabase().from("rentals_inventory").delete().eq("id", item.id);
    if (error) {
      if (error.code === "23503")
        throw new Error("La prenda tiene contratos registrados. Márcala como 'Baja' en lugar de eliminarla.");
      throw error;
    }
    await storageService.removeByUrls("rentals-gallery", item.images ?? []);
  },
};

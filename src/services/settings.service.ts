import { getSupabase } from "@/lib/supabase/client";
import type { BusinessSettings } from "@/types";
import type { SettingsFormValues } from "@/lib/validations";
import { storageService } from "./storage.service";

export type BusinessAssetKind = "yape" | "plin" | "logo";

const COLUMN: Record<BusinessAssetKind, "yape_qr_url" | "plin_qr_url" | "logo_url"> = {
  yape: "yape_qr_url",
  plin: "plin_qr_url",
  logo: "logo_url",
};

const nullIfEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const settingsService = {
  /** Devuelve la configuración única del negocio (la crea si no existe). */
  async get(): Promise<BusinessSettings> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;

    const { data: created, error: insertError } = await supabase
      .from("business_settings")
      .insert({ business_name: "Taller de Costura Marisol" })
      .select("*")
      .single();
    if (insertError) throw insertError;
    return created;
  },

  async update(id: string, values: SettingsFormValues): Promise<BusinessSettings> {
    const { data, error } = await getSupabase()
      .from("business_settings")
      .update({
        business_name: values.business_name.trim(),
        phone: nullIfEmpty(values.phone),
        address: nullIfEmpty(values.address),
        ruc_dni: nullIfEmpty(values.ruc_dni),
        receipt_message: nullIfEmpty(values.receipt_message),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /** Sube el QR de Yape / Plin o el logo al bucket `business-assets` y reemplaza el anterior. */
  async uploadAsset(settings: BusinessSettings, kind: BusinessAssetKind, file: File): Promise<BusinessSettings> {
    const column = COLUMN[kind];
    // Los QR no se comprimen para no perder nitidez al escanearlos
    const url = await storageService.uploadImage("business-assets", file, kind, { compress: kind === "logo" });
    const { data, error } = await getSupabase()
      .from("business_settings")
      .update({ [column]: url } as Partial<BusinessSettings>)
      .eq("id", settings.id)
      .select("*")
      .single();
    if (error) throw error;
    await storageService.removeByUrls("business-assets", [settings[column]]);
    return data;
  },

  async removeAsset(settings: BusinessSettings, kind: BusinessAssetKind): Promise<BusinessSettings> {
    const column = COLUMN[kind];
    const { data, error } = await getSupabase()
      .from("business_settings")
      .update({ [column]: null } as Partial<BusinessSettings>)
      .eq("id", settings.id)
      .select("*")
      .single();
    if (error) throw error;
    await storageService.removeByUrls("business-assets", [settings[column]]);
    return data;
  },
};

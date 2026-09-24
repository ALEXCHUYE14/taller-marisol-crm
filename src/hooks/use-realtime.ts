"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";

const TABLE_KEYS: Record<string, string[]> = {
  rentals: ["rentals", "dashboard", "inventory", "client-history", "caja"],
  tailoring_orders: ["tailoring", "dashboard", "client-history", "caja"],
  payments: ["payments", "dashboard", "caja"],
  rentals_inventory: ["inventory", "dashboard"],
  clients: ["clients"],
};

/**
 * Tablas del módulo Caja, en un canal APARTE: si aún no se ejecutó supabase/caja.sql, esas tablas no existen
 * y Supabase rechaza la suscripción. Separadas, el resto del sistema sigue actualizándose en tiempo real.
 */
const CAJA_TABLES = ["expenses", "cash_closings"];

/** Escucha cambios en Postgres (Supabase Realtime) e invalida las queries afectadas. */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();

    const flush = () => {
      pending.forEach((key) => void qc.invalidateQueries({ queryKey: [key] }));
      pending.clear();
    };

    const listen = (name: string, tables: Record<string, string[]>) => {
      const channel = supabase.channel(name);
      Object.entries(tables).forEach(([table, keys]) => {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
          keys.forEach((k) => pending.add(k));
          if (timer) clearTimeout(timer);
          timer = setTimeout(flush, 400);
        });
      });
      channel.subscribe();
      return channel;
    };

    const main = listen("taller-cambios", TABLE_KEYS);
    const caja = listen("taller-caja", Object.fromEntries(CAJA_TABLES.map((t) => [t, ["caja"]])));

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(main);
      void supabase.removeChannel(caja);
    };
  }, [qc]);
}

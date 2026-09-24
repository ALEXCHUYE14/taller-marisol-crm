"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";

const TABLE_KEYS: Record<string, string[]> = {
  rentals: ["rentals", "dashboard", "inventory", "client-history"],
  tailoring_orders: ["tailoring", "dashboard", "client-history"],
  payments: ["payments", "dashboard"],
  rentals_inventory: ["inventory", "dashboard"],
  clients: ["clients"],
};

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

    const channel = supabase.channel("taller-cambios");
    Object.entries(TABLE_KEYS).forEach(([table, keys]) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        keys.forEach((k) => pending.add(k));
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 400);
      });
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}

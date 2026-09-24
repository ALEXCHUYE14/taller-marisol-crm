"use client";

import { useMemo } from "react";
import { Receipt } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { formatDayLong, limaDateOf, limaTimeOf } from "@/lib/cash";
import { incomeConcept } from "@/lib/cash-export";
import { formatMoney } from "@/lib/format";
import type { IncomeRow } from "@/services";
import { cn } from "@/lib/utils";

/** Detalle de cada cobro del periodo, agrupado por día (hora de Lima) */
export function IncomesTab({ incomes }: { incomes: IncomeRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, IncomeRow[]>();
    for (const p of incomes) {
      if (!p.created_at) continue;
      const day = limaDateOf(p.created_at);
      map.set(day, [...(map.get(day) ?? []), p]);
    }
    return [...map.entries()];
  }, [incomes]);

  if (!groups.length) {
    return (
      <EmptyState
        icon={<Receipt />}
        title="Sin cobros en este periodo"
        description="Los adelantos, saldos y pagos de alquileres y confecciones aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([day, rows]) => {
        const total = rows.filter((r) => r.payment_type !== "Garantía").reduce((s, r) => s + Number(r.amount), 0);
        return (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h3 className="font-serif text-base font-semibold first-letter:uppercase text-warmgray-800">{formatDayLong(day)}</h3>
              <span className="shrink-0 text-sm font-semibold text-olive">{formatMoney(total)}</span>
            </div>
            <ul className="divide-y divide-warmgray-100 overflow-hidden rounded-2xl border border-warmgray-200 bg-white shadow-soft">
              {rows.map((p) => {
                const { concept, who } = incomeConcept(p);
                const guarantee = p.payment_type === "Garantía";
                return (
                  <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-3 sm:px-4">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words font-semibold text-warmgray-800">{who}</p>
                      <p className="line-clamp-2 break-words text-xs text-warmgray-500">{concept}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-warmgray-500">{p.created_at ? limaTimeOf(p.created_at) : ""}</span>
                        <Badge tone="gray">{p.payment_method ?? "Efectivo"}</Badge>
                        {guarantee ? (
                          <Badge tone="amber">Garantía · se devuelve</Badge>
                        ) : (
                          p.payment_type && <Badge tone="olive">{p.payment_type}</Badge>
                        )}
                      </div>
                    </div>
                    <span className={cn("shrink-0 text-base font-semibold", guarantee ? "text-warmgray-500" : "text-olive")}>
                      {formatMoney(Number(p.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

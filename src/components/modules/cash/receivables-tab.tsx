"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, HandCoins } from "lucide-react";
import { Badge, Button, EmptyState, Segmented, Skeleton, StatusBadge, WhatsAppIcon } from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { useReceivables } from "@/hooks/use-cash";
import { isMissingCajaSetup } from "@/services";
import { daysUntil, formatDate, formatMoney, relativeDayLabel } from "@/lib/format";
import { openWhatsApp, templates } from "@/lib/whatsapp";
import { cn, getErrorMessage } from "@/lib/utils";
import type { Receivable } from "@/types";
import { ErrorNote, SetupNotice } from "./shared";

type Filter = "todos" | "alquileres" | "confecciones" | "vencidos";

/** Saldos pendientes de alquileres y confecciones: clientes que dejaron una parte y deben el resto */
export function ReceivablesTab() {
  const { data, isLoading, error } = useReceivables();
  const { data: settings } = useSettings();
  const [filter, setFilter] = useState<Filter>("todos");
  const business = settings?.business_name ?? "Taller Marisol";

  const isOverdue = (r: Receivable) => Boolean(r.due_date) && daysUntil(r.due_date!) < 0;

  const rows = useMemo(() => {
    const all = data ?? [];
    switch (filter) {
      case "alquileres":
        return all.filter((r) => r.kind === "Alquiler");
      case "confecciones":
        return all.filter((r) => r.kind === "Confección");
      case "vencidos":
        return all.filter(isOverdue);
      default:
        return all;
    }
  }, [data, filter]);

  if (isMissingCajaSetup(error)) return <SetupNotice />;
  if (error) return <ErrorNote message={getErrorMessage(error)} />;
  if (isLoading) return <Skeleton className="h-40" />;

  const all = data ?? [];
  const totalDue = all.reduce((s, r) => s + Number(r.balance), 0);
  const overdue = all.filter(isOverdue);
  const overdueTotal = overdue.reduce((s, r) => s + Number(r.balance), 0);

  const remind = (r: Receivable) => {
    const concept = r.kind === "Alquiler" ? `el alquiler de ${r.description ?? "tu prenda"}` : `tu confección (${r.description ?? ""})`;
    openWhatsApp(r.client_phone, templates.paymentDue(r.client_name ?? "", formatMoney(Number(r.balance)), concept, business));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-warmgray-200 bg-white p-4 shadow-soft">
          <p className="text-sm font-medium text-warmgray-600">Total por cobrar</p>
          <p className="mt-1 font-serif text-3xl font-semibold text-warmgray-800">{formatMoney(totalDue)}</p>
          <p className="mt-1 text-sm text-warmgray-500">{all.length} cuenta(s) con saldo pendiente</p>
        </div>
        <div className={cn("rounded-2xl border bg-white p-4 shadow-soft", overdue.length ? "border-burgundy-100" : "border-warmgray-200")}>
          <p className="text-sm font-medium text-warmgray-600">Vencido (fecha ya pasó)</p>
          <p className={cn("mt-1 font-serif text-3xl font-semibold", overdue.length ? "text-burgundy" : "text-warmgray-800")}>
            {formatMoney(overdueTotal)}
          </p>
          <p className="mt-1 text-sm text-warmgray-500">{overdue.length} cuenta(s) vencida(s)</p>
        </div>
      </div>

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "todos", label: "Todos", count: all.length },
          { value: "alquileres", label: "Alquileres" },
          { value: "confecciones", label: "Confecciones" },
          { value: "vencidos", label: "Vencidos", count: overdue.length },
        ]}
      />

      {!rows.length ? (
        <EmptyState
          icon={<HandCoins />}
          title={all.length ? "Nada en esta vista" : "No hay saldos pendientes"}
          description={all.length ? undefined : "Cuando un cliente deje solo una parte pagada, su saldo aparecerá aquí."}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((r) => {
            const late = isOverdue(r);
            return (
              <li
                key={`${r.kind}-${r.id}`}
                className={cn("min-w-0 rounded-2xl border bg-white p-3 shadow-soft sm:p-4", late ? "border-burgundy-100 ring-1 ring-burgundy/20" : "border-warmgray-200")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words font-semibold leading-snug text-warmgray-800">{r.client_name ?? "Cliente"}</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-sm text-warmgray-600">{r.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={r.kind === "Alquiler" ? "olive" : "terracotta"}>{r.kind}</Badge>
                    {r.status && <StatusBadge status={r.status} context={r.kind === "Confección" ? "order" : undefined} />}
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-warmgray-100/60 px-3 py-2 text-center">
                  <Amount label="Total" value={Number(r.total)} />
                  <Amount label="Pagado" value={Number(r.paid)} />
                  <Amount label="Debe" value={Number(r.balance)} strong />
                </div>

                {r.due_date && (
                  <p className={cn("mt-2 flex items-center gap-1 text-xs", late ? "font-semibold text-burgundy" : "text-warmgray-500")}>
                    {late && <AlertTriangle className="size-3.5" />}
                    {r.kind === "Alquiler" ? "Devolución" : "Entrega"}: {formatDate(r.due_date)} · {relativeDayLabel(r.due_date)}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="whatsapp" className="min-w-[8rem] flex-1" onClick={() => remind(r)} disabled={!r.client_phone}>
                    <WhatsAppIcon /> Recordar pago
                  </Button>
                  <Button size="sm" variant="outline" className="min-w-[6rem] flex-1" asChild>
                    <Link href={r.kind === "Alquiler" ? "/alquileres" : "/confecciones"}>
                      Ir a {r.kind === "Alquiler" ? "alquileres" : "confecciones"} <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Amount({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-warmgray-500">{label}</p>
      <p className={cn("truncate text-sm", strong ? "font-bold text-burgundy" : "font-semibold text-warmgray-800")}>{formatMoney(value)}</p>
    </div>
  );
}

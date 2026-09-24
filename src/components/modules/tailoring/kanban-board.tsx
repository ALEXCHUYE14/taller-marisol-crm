"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, ImageIcon, Inbox, Scissors, Shirt, Sparkles, Ruler, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { tailoringService } from "@/services";
import { daysUntil, formatDate, formatMoney, relativeDayLabel } from "@/lib/format";
import { getErrorMessage, cn } from "@/lib/utils";
import { TAILORING_STATUSES, type TailoringOrderWithClient, type TailoringStatus } from "@/types";

const COLUMN_META: Record<TailoringStatus, { label: string; icon: React.ReactNode; accent: string }> = {
  Recibido: { label: "Recibido", icon: <Inbox />, accent: "bg-warmgray-400" },
  "En Corte": { label: "En Corte", icon: <Scissors />, accent: "bg-amber-500" },
  "En Costura": { label: "En Costura", icon: <Shirt />, accent: "bg-terracotta" },
  "Prueba Pendiente": { label: "Prueba", icon: <Ruler />, accent: "bg-terracotta-600" },
  "Listo para Entregar": { label: "Listo", icon: <Sparkles />, accent: "bg-olive" },
  Entregado: { label: "Entregado", icon: <PackageCheck />, accent: "bg-olive-800" },
};

/**
 * Tablero Kanban: Recibido ➔ En Corte ➔ En Costura ➔ Prueba ➔ Listo (➔ Entregado).
 * Escritorio: arrastrar y soltar. Móvil: columnas deslizables + flechas en cada tarjeta.
 */
export function KanbanBoard({
  orders,
  showDelivered,
  onOpen,
  queryKey,
}: {
  orders: TailoringOrderWithClient[];
  showDelivered: boolean;
  onOpen: (o: TailoringOrderWithClient) => void;
  queryKey: readonly unknown[];
}) {
  const qc = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TailoringStatus | null>(null);
  const columns = TAILORING_STATUSES.filter((s) => showDelivered || s !== "Entregado");

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TailoringStatus }) => tailoringService.setStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<TailoringOrderWithClient[]>(queryKey);
      qc.setQueryData<TailoringOrderWithClient[]>(queryKey, (old) => old?.map((o) => (o.id === id ? { ...o, status } : o)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(getErrorMessage(e));
    },
    onSuccess: (_d, { status }) => {
      toast.success(`Movido a “${status}”`);
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const shift = (o: TailoringOrderWithClient, delta: number) => {
    const idx = TAILORING_STATUSES.indexOf(o.status ?? "Recibido");
    const next = TAILORING_STATUSES[idx + delta];
    if (next) move.mutate({ id: o.id, status: next });
  };

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      {columns.map((status) => {
        const items = orders.filter((o) => (o.status ?? "Recibido") === status);
        const meta = COLUMN_META[status];
        const total = items.reduce((s, o) => s + Number(o.pending_balance ?? 0), 0);
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(status);
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setOverCol(null);
              setDragId(null);
              const o = orders.find((x) => x.id === id);
              if (o && o.status !== status) move.mutate({ id, status });
            }}
            className={cn(
              "flex w-[82vw] shrink-0 snap-center flex-col rounded-2xl bg-warmgray-200/50 p-2 transition-colors sm:w-72",
              overCol === status && "bg-terracotta-50 ring-2 ring-terracotta/40",
            )}
          >
            <header className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("flex size-7 items-center justify-center rounded-lg text-white [&_svg]:size-4", meta.accent)}>{meta.icon}</span>
                <h3 className="font-semibold text-warmgray-800">{meta.label}</h3>
                <span className="rounded-full bg-white px-2 text-xs font-bold text-warmgray-600">{items.length}</span>
              </div>
              {total > 0 && <span className="text-[11px] text-warmgray-500">Saldo {formatMoney(total)}</span>}
            </header>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2">
              <AnimatePresence initial={false}>
                {items.map((o) => {
                  const d = daysUntil(o.delivery_date);
                  const done = status === "Listo para Entregar" || status === "Entregado";
                  const late = !done && d < 0;
                  const today = !done && d === 0;
                  const idx = TAILORING_STATUSES.indexOf(status);
                  return (
                    <motion.article
                      key={o.id}
                      layout
                      layoutId={o.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: dragId === o.id ? 0.5 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className={cn(
                        "cursor-grab rounded-xl border bg-white p-3 shadow-soft active:cursor-grabbing",
                        late ? "border-burgundy-100 ring-1 ring-burgundy/25" : today ? "border-amber-100 ring-1 ring-amber-500/30" : "border-warmgray-200",
                      )}
                    >
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", o.id);
                          setDragId(o.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onOpen(o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && onOpen(o)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-warmgray-400">N° {o.order_number}</p>
                          {(late || today) && (
                            <span className={cn("flex items-center gap-1 text-[11px] font-bold", late ? "text-burgundy" : "text-amber-700")}>
                              <AlertTriangle className="size-3.5" /> {relativeDayLabel(o.delivery_date)}
                            </span>
                          )}
                        </div>
                        <p className="truncate font-semibold text-warmgray-800">{o.client?.full_name ?? "Cliente"}</p>
                        <p className="line-clamp-2 text-sm text-warmgray-600">{o.garment_description}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-warmgray-500">
                          <span>{formatDate(o.delivery_date, "EEE dd/MM")}</span>
                          <span className="flex items-center gap-2">
                            {!!o.reference_images?.length && (
                              <span className="flex items-center gap-0.5">
                                <ImageIcon className="size-3.5" /> {o.reference_images.length}
                              </span>
                            )}
                            {Number(o.pending_balance) > 0 ? (
                              <span className="font-semibold text-terracotta-600">Debe {formatMoney(o.pending_balance)}</span>
                            ) : (
                              <span className="font-semibold text-olive">Pagado</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-warmgray-100 pt-2">
                        <button
                          disabled={idx === 0}
                          onClick={() => shift(o, -1)}
                          aria-label="Retroceder etapa"
                          className="flex size-10 items-center justify-center rounded-lg text-warmgray-500 hover:bg-warmgray-100 disabled:opacity-30"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <span className="self-center text-[11px] text-warmgray-400">{o.service_type}</span>
                        <button
                          disabled={idx === TAILORING_STATUSES.length - 1}
                          onClick={() => shift(o, 1)}
                          aria-label="Avanzar etapa"
                          className="flex h-10 items-center gap-1 rounded-lg bg-olive-50 px-3 text-xs font-semibold text-olive hover:bg-olive-100 disabled:opacity-30"
                        >
                          Avanzar <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
              {!items.length && (
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-warmgray-300 p-4 text-center text-xs text-warmgray-400">
                  Arrastra una orden aquí
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

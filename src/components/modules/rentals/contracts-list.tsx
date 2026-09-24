"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, MoreHorizontal, PackageCheck, Receipt, Shirt, Undo2, XCircle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, ConfirmDialog, EmptyState, Segmented, Skeleton, StatusBadge, WhatsAppIcon } from "@/components/ui";
import { useCrudMutation, useRentals } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { paymentsService, rentalsService, type RentalListFilter } from "@/services";
import { daysUntil, formatDate, formatMoney, relativeDayLabel } from "@/lib/format";
import { openWhatsApp, templates } from "@/lib/whatsapp";
import { receiptFromRental } from "@/lib/receipt";
import type { ReceiptData, RentalWithRelations } from "@/types";
import { cn } from "@/lib/utils";
import { ReceiptModal } from "../receipt/receipt-modal";
import { DeliverRentalModal, ReturnRentalModal } from "./rental-action-modals";

export function ContractsList() {
  const [filter, setFilter] = useState<RentalListFilter>("activos");
  const { data, isLoading } = useRentals(filter);
  const { data: settings } = useSettings();
  const [delivering, setDelivering] = useState<RentalWithRelations | null>(null);
  const [returning, setReturning] = useState<RentalWithRelations | null>(null);
  const [cancelling, setCancelling] = useState<RentalWithRelations | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [menu, setMenu] = useState<RentalWithRelations | null>(null);

  const cancel = useCrudMutation((r: RentalWithRelations) => rentalsService.cancel(r.id), {
    success: "Alquiler cancelado",
    onSuccess: () => setCancelling(null),
  });

  const business = settings?.business_name ?? "Taller Marisol";

  const remind = (r: RentalWithRelations) => {
    const name = r.client?.full_name ?? "";
    const garment = r.item?.name ?? "prenda";
    const msg =
      r.status === "Con Retraso"
        ? templates.rentalOverdue(name, r.return_date, garment, business)
        : r.status === "Reservado"
          ? templates.rentalPickup(name, r.pickup_date, garment, business)
          : templates.rentalReminder(name, r.return_date, garment, business);
    openWhatsApp(r.client?.phone, msg);
  };

  const ticket = async (r: RentalWithRelations) => setReceipt(receiptFromRental(r, await paymentsService.byRental(r.id)));

  return (
    <div className="space-y-4">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "activos", label: "Activos" },
          { value: "por-vencer", label: "En poder del cliente" },
          { value: "vencidos", label: "Vencidos" },
          { value: "historial", label: "Historial" },
        ]}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon={<CalendarClock />} title="Sin contratos en esta vista" description="Los alquileres registrados aparecerán aquí ordenados por fecha de devolución." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.map((r, i) => {
            const d = daysUntil(r.return_date);
            const urgent = r.status === "Con Retraso" || (r.status === "Entregado" && d <= 0);
            const soon = r.status === "Entregado" && d === 1;
            return (
              <motion.article
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={cn(
                  "min-w-0 rounded-2xl border bg-white p-3 shadow-soft sm:p-4",
                  urgent ? "border-burgundy-100 ring-1 ring-burgundy/20" : soon ? "border-amber-100" : "border-warmgray-200",
                )}
              >
                <div className="flex gap-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-warmgray-100 text-warmgray-300 sm:size-20">
                    {r.item?.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.item.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Shirt className="size-7" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                      <p className="line-clamp-2 min-w-0 flex-[1_1_8rem] break-words font-semibold leading-snug text-warmgray-800">
                        {r.client?.full_name ?? "Cliente"}
                      </p>
                      <StatusBadge status={r.status} className="shrink-0" />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-warmgray-600">
                      {r.item?.name} · T{r.item?.size}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warmgray-100/60 px-3 py-2 text-xs text-warmgray-500">
                  <span className="whitespace-nowrap">
                    {formatDate(r.pickup_date, "dd/MM")} → <b className={cn(urgent && "text-burgundy", soon && "text-amber-700")}>{formatDate(r.return_date, "dd/MM")}</b>
                  </span>
                  {(r.status === "Entregado" || r.status === "Con Retraso") && (
                    <span className={cn("flex items-center gap-1 whitespace-nowrap font-semibold", urgent ? "text-burgundy" : soon ? "text-amber-700" : "text-warmgray-500")}>
                      {urgent && <AlertTriangle className="size-3.5" />}
                      {relativeDayLabel(r.return_date)}
                    </span>
                  )}
                  <span className="whitespace-nowrap font-semibold text-warmgray-700">{formatMoney(r.total_amount)}</span>
                  <span className="whitespace-nowrap">Garantía: {r.guarantee_status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "Reservado" && (
                    <Button size="sm" className="min-w-[6rem] flex-1" onClick={() => setDelivering(r)}>
                      <PackageCheck /> Entregar
                    </Button>
                  )}
                  {(r.status === "Entregado" || r.status === "Con Retraso") && (
                    <Button size="sm" className="min-w-[6rem] flex-1" onClick={() => setReturning(r)}>
                      <Undo2 /> Recibir
                    </Button>
                  )}
                  <Button size="sm" variant="whatsapp" className="min-w-[6rem] flex-1" onClick={() => remind(r)}>
                    <WhatsAppIcon /> Recordar
                  </Button>
                  <Button size="icon-sm" variant="outline" className="ml-auto" aria-label="Más acciones" onClick={() => setMenu(r)}>
                    <MoreHorizontal />
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Menú de acciones (hoja inferior simple) */}
      <Dialog.Root open={Boolean(menu)} onOpenChange={(o) => !o && setMenu(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-warmgray-800/30" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lift sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-80 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <Dialog.Title className="mb-2 px-2 font-serif text-lg font-semibold text-olive">Acciones</Dialog.Title>
            <Dialog.Description className="sr-only">Acciones del contrato</Dialog.Description>
            <div className="space-y-1">
              <MenuItem icon={<Receipt />} label="Ver / enviar ticket" onClick={() => { const r = menu; setMenu(null); if (r) void ticket(r); }} />
              {menu && ["Reservado", "Entregado"].includes(menu.status ?? "") && (
                <MenuItem icon={<XCircle />} label="Cancelar alquiler" danger onClick={() => { setCancelling(menu); setMenu(null); }} />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DeliverRentalModal rental={delivering} onClose={() => setDelivering(null)} />
      <ReturnRentalModal rental={returning} onClose={() => setReturning(null)} />
      <ReceiptModal open={Boolean(receipt)} onOpenChange={(o) => !o && setReceipt(null)} data={receipt} />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancelar alquiler"
        description="La prenda volverá a estar disponible. Los pagos registrados se mantienen en el historial de caja."
        confirmLabel="Cancelar alquiler"
        danger
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
      />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-touch w-full items-center gap-3 rounded-xl px-3 text-left font-medium [&_svg]:size-5",
        danger ? "text-burgundy hover:bg-burgundy-50" : "text-warmgray-700 hover:bg-warmgray-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

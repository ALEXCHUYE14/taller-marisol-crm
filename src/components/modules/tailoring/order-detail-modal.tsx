"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, MessageCircle, Pencil, Receipt, Ruler, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Field, Input, Modal, StatusBadge } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { paymentsService, tailoringService } from "@/services";
import { formatDate, formatMoney, relativeDayLabel } from "@/lib/format";
import { openWhatsApp, templates } from "@/lib/whatsapp";
import { receiptFromOrder } from "@/lib/receipt";
import { MEASURE_FIELDS, TAILORING_STATUSES, type PaymentMethod, type ReceiptData, type TailoringOrderWithClient } from "@/types";
import { cn } from "@/lib/utils";
import { PaymentMethodPicker } from "../shared/payment-method-picker";
import { ReceiptModal } from "../receipt/receipt-modal";

export function OrderDetailModal({
  order,
  onClose,
  onEdit,
}: {
  order: TailoringOrderWithClient | null;
  onClose: () => void;
  onEdit: (o: TailoringOrderWithClient) => void;
}) {
  const { data: settings } = useSettings();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const setStatus = useCrudMutation((s: (typeof TAILORING_STATUSES)[number]) => tailoringService.setStatus(order!.id, s), {
    success: (_, s) => `Orden movida a “${s}”`,
  });
  const pay = useCrudMutation(() => tailoringService.addPayment(order!, amount, method), {
    success: "Pago registrado",
    onSuccess: () => {
      setPaying(false);
      onClose();
    },
  });
  const remove = useCrudMutation(() => tailoringService.remove(order!), {
    success: "Orden eliminada",
    onSuccess: () => {
      setConfirmDelete(false);
      onClose();
    },
  });

  if (!order) return null;
  const balance = Number(order.pending_balance ?? Number(order.total_price) - Number(order.advance_payment ?? 0));
  const measures = Object.entries(order.specific_measures ?? {}).filter(([, v]) => v);
  const business = settings?.business_name ?? "Taller Marisol";
  const currentIdx = TAILORING_STATUSES.indexOf(order.status ?? "Recibido");

  return (
    <>
      <Modal open onOpenChange={(o) => !o && onClose()} title={`Orden N° ${order.order_number}`} description={`${order.client?.full_name ?? "Cliente"} · ${order.service_type}`} size="lg">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} context="order" />
            <span className="flex items-center gap-1 text-sm text-warmgray-600">
              <CalendarDays className="size-4" /> Entrega {formatDate(order.delivery_date)} ({relativeDayLabel(order.delivery_date)})
            </span>
          </div>

          <p className="rounded-xl bg-white p-3 text-[15px] ring-1 ring-warmgray-200">{order.garment_description}</p>

          {/* Avance del tablero */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-warmgray-400">Avance de confección</p>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {TAILORING_STATUSES.map((s, i) => (
                <button
                  key={s}
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(s, { onSuccess: onClose })}
                  className={cn(
                    "h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors",
                    i === currentIdx
                      ? "border-olive bg-olive text-white"
                      : i < currentIdx
                        ? "border-olive-200 bg-olive-50 text-olive"
                        : "border-warmgray-300 bg-white text-warmgray-600 hover:bg-warmgray-100",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!!order.reference_images?.length && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-warmgray-400">Referencias del cliente</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {order.reference_images.map((url) => (
                  <button key={url} onClick={() => setZoom(url)} className="aspect-square overflow-hidden rounded-xl bg-warmgray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Referencia" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {!!measures.length && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-warmgray-400">
                <Ruler className="size-3.5" /> Medidas
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {measures.map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white px-3 py-2 ring-1 ring-warmgray-200">
                    <p className="text-[10px] font-semibold uppercase text-warmgray-500">{MEASURE_FIELDS.find((f) => f.key === k)?.label ?? k}</p>
                    <p className="font-semibold">{v} cm</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-olive p-4 text-center text-white">
            <div>
              <p className="text-xs opacity-80">Total</p>
              <p className="font-serif text-lg font-semibold">{formatMoney(order.total_price)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">A cuenta</p>
              <p className="font-serif text-lg font-semibold">{formatMoney(order.advance_payment)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Saldo</p>
              <p className={cn("font-serif text-lg font-semibold", balance > 0 && "text-terracotta-200")}>{formatMoney(balance)}</p>
            </div>
          </div>

          {paying && (
            <div className="space-y-3 rounded-2xl border border-terracotta-200 bg-terracotta-50/40 p-4">
              <Field label="Monto a cobrar (S/)">
                <Input type="number" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </Field>
              <PaymentMethodPicker value={method} onChange={setMethod} amount={amount} />
              <Button block variant="accent" loading={pay.isPending} disabled={amount <= 0 || amount > balance + 0.001} onClick={() => pay.mutate(undefined)}>
                Registrar pago de {formatMoney(amount)}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {balance > 0 && !paying && (
              <Button variant="accent" onClick={() => { setAmount(balance); setPaying(true); }}>
                <CreditCard /> Cobrar saldo
              </Button>
            )}
            <Button
              variant="whatsapp"
              onClick={() =>
                openWhatsApp(
                  order.client?.phone,
                  order.status === "Prueba Pendiente"
                    ? templates.orderFitting(order.client?.full_name ?? "", order.order_number, business)
                    : templates.orderReady(order.client?.full_name ?? "", order.order_number, business),
                )
              }
            >
              <MessageCircle /> {order.status === "Prueba Pendiente" ? "Citar a prueba" : "Avisar listo"}
            </Button>
            <Button variant="outline" onClick={async () => setReceipt(receiptFromOrder(order, await paymentsService.byOrder(order.id)))}>
              <Receipt /> Ticket
            </Button>
            <Button variant="outline" onClick={() => onEdit(order)}>
              <Pencil /> Editar
            </Button>
            <Button variant="ghost" className="text-burgundy" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(zoom)} onOpenChange={(o) => !o && setZoom(null)} title="Referencia" size="xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {zoom && <img src={zoom} alt="Referencia ampliada" className="mx-auto max-h-[70dvh] rounded-xl object-contain" />}
      </Modal>
      <ReceiptModal open={Boolean(receipt)} onOpenChange={(o) => !o && setReceipt(null)} data={receipt} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar orden"
        description="Se eliminará la orden y sus fotos de referencia. Los pagos quedan en el historial de caja."
        confirmLabel="Eliminar"
        danger
        loading={remove.isPending}
        onConfirm={() => remove.mutate(undefined)}
      />
    </>
  );
}

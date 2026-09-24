"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { paymentsService, rentalsService } from "@/services";
import { formatMoney } from "@/lib/format";
import { GUARANTEE_STATUSES, PAYMENT_METHODS, type GuaranteeStatus, type PaymentMethod, type RentalWithRelations } from "@/types";
import { cn } from "@/lib/utils";
import { PaymentMethodPicker } from "../shared/payment-method-picker";

/** Entrega de una prenda reservada: cobra saldo pendiente + garantía */
export function DeliverRentalModal({ rental, onClose }: { rental: RentalWithRelations | null; onClose: () => void }) {
  const payments = useQuery({
    queryKey: ["payments", "rental", rental?.id],
    queryFn: () => paymentsService.byRental(rental!.id),
    enabled: Boolean(rental),
  });
  const paid = (payments.data ?? []).filter((p) => p.payment_type !== "Garantía").reduce((s, p) => s + Number(p.amount), 0);
  const guaranteePaid = (payments.data ?? []).filter((p) => p.payment_type === "Garantía").reduce((s, p) => s + Number(p.amount), 0);
  const pending = Math.max(0, Number(rental?.total_amount ?? 0) - paid);
  const guaranteePending = Math.max(0, Number(rental?.deposit_amount ?? 0) - guaranteePaid);

  const [balance, setBalance] = useState(0);
  const [guarantee, setGuarantee] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [reference, setReference] = useState("");

  useEffect(() => {
    setBalance(pending);
    setGuarantee(guaranteePending);
  }, [pending, guaranteePending]);

  const deliver = useCrudMutation(
    () => rentalsService.deliver(rental!, { balance, guarantee, method, reference }),
    { success: "Prenda entregada al cliente", onSuccess: onClose },
  );

  return (
    <Modal
      open={Boolean(rental)}
      onOpenChange={(o) => !o && onClose()}
      title="Entregar prenda"
      description={rental ? `${rental.item?.name} → ${rental.client?.full_name}` : ""}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={deliver.isPending} onClick={() => deliver.mutate(undefined)}>
            Confirmar entrega · {formatMoney(balance + guarantee)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Saldo del alquiler" hint={`Pendiente: ${formatMoney(pending)}`}>
            <Input type="number" step="0.01" inputMode="decimal" value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
          </Field>
          <Field label="Garantía a cobrar" hint={`Pactada: ${formatMoney(rental?.deposit_amount)}`}>
            <Input type="number" step="0.01" inputMode="decimal" value={guarantee} onChange={(e) => setGuarantee(Number(e.target.value))} />
          </Field>
        </div>
        <PaymentMethodPicker value={method} onChange={setMethod} amount={balance + guarantee} />
        {method !== "Efectivo" && (
          <Field label="N° de operación">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Opcional" />
          </Field>
        )}
      </div>
    </Modal>
  );
}

const GUARANTEE_HELP: Record<GuaranteeStatus, string> = {
  Devuelta: "La prenda volvió en buen estado. Devuelve la garantía al cliente.",
  Retenida: "Se retiene temporalmente (p.ej. pendiente de revisión o lavado).",
  "Retenida por Daño": "La prenda volvió dañada: la garantía cubre la reparación.",
};

/** Recepción de la prenda devuelta */
export function ReturnRentalModal({ rental, onClose }: { rental: RentalWithRelations | null; onClose: () => void }) {
  const [guarantee, setGuarantee] = useState<GuaranteeStatus>("Devuelta");
  const [notes, setNotes] = useState("");
  const [refund, setRefund] = useState(true);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("Efectivo");

  const payments = useQuery({
    queryKey: ["payments", "rental", rental?.id],
    queryFn: () => paymentsService.byRental(rental!.id),
    enabled: Boolean(rental),
  });
  const guaranteePayments = (payments.data ?? []).filter((p) => p.payment_type === "Garantía");
  const guaranteePaid = guaranteePayments.reduce((s, p) => s + Number(p.amount), 0);
  const paidWith = guaranteePayments[guaranteePayments.length - 1]?.payment_method;

  useEffect(() => {
    setGuarantee("Devuelta");
    setNotes(rental?.notes ?? "");
    setRefund(true);
  }, [rental]);

  // La garantía se devuelve por el mismo medio con el que se cobró (editable)
  useEffect(() => {
    if (paidWith) setRefundMethod(paidWith);
  }, [paidWith, rental?.id]);

  const showRefund = guarantee === "Devuelta" && guaranteePaid > 0;
  const refundEntry =
    showRefund && refund && rental
      ? {
          amount: guaranteePaid,
          method: refundMethod,
          description: `Garantía devuelta · ${rental.client?.full_name ?? "Cliente"} · ${rental.item?.name ?? "Prenda"}`,
        }
      : undefined;

  const ret = useCrudMutation(
    () => rentalsService.markReturned(rental!.id, guarantee, notes.trim() || undefined, refundEntry),
    {
      success: "Devolución registrada · prenda disponible",
      onSuccess: (result) => {
        if (result.refundNote) toast.warning(result.refundNote, { duration: 9000 });
        onClose();
      },
    },
  );

  return (
    <Modal
      open={Boolean(rental)}
      onOpenChange={(o) => !o && onClose()}
      title="Recibir devolución"
      description={rental ? `${rental.item?.name} · ${rental.client?.full_name}` : ""}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={ret.isPending} onClick={() => ret.mutate(undefined)}>
            Registrar devolución
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-warmgray-600">
          Garantía cobrada: <b>{formatMoney(payments.data ? guaranteePaid : rental?.deposit_amount)}</b>. ¿Qué pasa con ella?
        </p>
        <div className="space-y-2">
          {GUARANTEE_STATUSES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGuarantee(g)}
              className={cn(
                "flex w-full flex-col items-start rounded-xl border-2 bg-white px-4 py-3 text-left transition-all",
                guarantee === g
                  ? g === "Retenida por Daño"
                    ? "border-burgundy bg-burgundy-50"
                    : "border-olive bg-olive-50"
                  : "border-warmgray-200",
              )}
            >
              <span className="font-semibold">{g}</span>
              <span className="text-xs text-warmgray-500">{GUARANTEE_HELP[g]}</span>
            </button>
          ))}
        </div>
        {showRefund && (
          <div className="space-y-3 rounded-xl border border-warmgray-200 bg-white p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={refund}
                onChange={(e) => setRefund(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-olive"
              />
              <span className="text-sm">
                <span className="font-semibold text-warmgray-800">Anotar la devolución de {formatMoney(guaranteePaid)} en Caja</span>
                <span className="block text-xs text-warmgray-500">
                  Sale dinero de la caja pero no cuenta como gasto. Así el efectivo del cierre cuadra.
                </span>
              </span>
            </label>
            {refund && (
              <Field label="Devuelto por">
                <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}
        <Field label="Observaciones">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Estado de la prenda, manchas, etc." />
        </Field>
      </div>
    </Modal>
  );
}

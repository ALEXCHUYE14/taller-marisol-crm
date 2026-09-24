"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ImageOff, MessageCircle, Receipt, Search } from "lucide-react";
import { Button, Field, Input, Modal, Skeleton, Textarea } from "@/components/ui";
import { useAvailableInventory, useCrudMutation } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { rentalsService, paymentsService } from "@/services";
import { rentalSchema, type RentalFormValues } from "@/lib/validations";
import { addDaysISO, formatDate, formatMoney, todayISO } from "@/lib/format";
import { openWhatsApp, templates } from "@/lib/whatsapp";
import { receiptFromRental } from "@/lib/receipt";
import type { Client, InventoryItem, ReceiptData, RentalWithRelations } from "@/types";
import { cn } from "@/lib/utils";
import { ClientPicker } from "../shared/client-picker";
import { PaymentMethodPicker } from "../shared/payment-method-picker";
import { ReceiptModal } from "../receipt/receipt-modal";

const STEPS = ["Cliente", "Prenda", "Fechas y cobro", "Listo"] as const;

/**
 * Flujo de Salida de Prenda:
 * 1. Seleccionar cliente o crear uno rápido
 * 2. Seleccionar traje (foto en miniatura)
 * 3. Fijar fecha de devolución y cobro de garantía
 * 4. Enviar recordatorio por WhatsApp / ticket
 */
export function RentalWizard({
  open,
  onOpenChange,
  preselectedItem,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preselectedItem?: InventoryItem | null;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [client, setClient] = useState<Client | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [created, setCreated] = useState<RentalWithRelations | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const { data: settings } = useSettings();
  const inventory = useAvailableInventory();

  const form = useForm<RentalFormValues>({
    resolver: zodResolver(rentalSchema),
    defaultValues: defaults(),
  });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset(defaults());
    setClient(null);
    setCreated(null);
    setItemSearch("");
    setItem(preselectedItem ?? null);
    if (preselectedItem) applyItem(preselectedItem);
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedItem]);

  function applyItem(i: InventoryItem) {
    setValue("inventory_id", i.id);
    setValue("total_amount", Number(i.rental_price));
    setValue("deposit_amount", Number(i.guarantee_price ?? 0));
  }

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const create = useCrudMutation((v: RentalFormValues) => rentalsService.create(v), {
    success: "Alquiler registrado",
    onSuccess: (rental) => {
      setCreated(rental);
      go(3);
    },
  });

  const filteredItems = useMemo(() => {
    const t = itemSearch.trim().toLowerCase();
    return (inventory.data ?? []).filter(
      (i) => !t || `${i.name} ${i.code} ${i.size} ${i.color ?? ""} ${i.category ?? ""}`.toLowerCase().includes(t),
    );
  }, [inventory.data, itemSearch]);

  const values = watch();
  const days = Math.max(
    1,
    Math.round((new Date(values.return_date).getTime() - new Date(values.pickup_date).getTime()) / 86_400_000),
  );
  const businessName = settings?.business_name ?? "Taller Marisol";

  const sendReminder = () => {
    if (!created) return;
    openWhatsApp(
      created.client?.phone,
      templates.rentalReminder(created.client?.full_name ?? "", created.return_date, created.item?.name ?? "prenda", businessName),
    );
  };

  const openTicket = async () => {
    if (!created) return;
    const payments = await paymentsService.byRental(created.id);
    setReceipt(receiptFromRental(created, payments));
  };

  const footer =
    step === 3 ? (
      <Button block onClick={() => onOpenChange(false)}>
        Terminar
      </Button>
    ) : (
      <>
        <Button variant="outline" onClick={() => (step === 0 ? onOpenChange(false) : go(step - 1))}>
          {step === 0 ? "Cancelar" : (<><ArrowLeft /> Atrás</>)}
        </Button>
        {step < 2 ? (
          <Button
            disabled={(step === 0 && !client) || (step === 1 && !item)}
            onClick={() => go(step + 1)}
          >
            Continuar <ArrowRight />
          </Button>
        ) : (
          <Button variant="accent" loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>
            <Check /> Registrar alquiler
          </Button>
        )}
      </>
    );

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title="Nuevo alquiler" size="lg" footer={footer}>
        {/* Indicador de pasos */}
        <ol className="mb-5 flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 flex-col gap-1.5">
              <span className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-terracotta" : "bg-warmgray-200")} />
              <span className={cn("hidden text-[11px] font-semibold sm:block", i === step ? "text-terracotta-600" : "text-warmgray-400")}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * dir }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-3">
                <h3 className="font-serif text-lg font-semibold text-warmgray-800">¿Quién alquila?</h3>
                <ClientPicker
                  value={client}
                  onChange={(c) => {
                    setClient(c);
                    if (c) setValue("client_id", c.id);
                  }}
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <h3 className="font-serif text-lg font-semibold text-warmgray-800">Elige la prenda disponible</h3>
                <Input icon={<Search />} placeholder="Buscar terno, talla, color…" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                <div className="grid max-h-[46dvh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {inventory.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                  {filteredItems.map((i) => {
                    const selected = item?.id === i.id;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          setItem(i);
                          applyItem(i);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 bg-white p-2 text-left transition-all",
                          selected ? "border-olive bg-olive-50" : "border-warmgray-200 hover:border-warmgray-300",
                        )}
                      >
                        <span className="size-16 shrink-0 overflow-hidden rounded-lg bg-warmgray-100">
                          {i.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-warmgray-300">
                              <ImageOff className="size-6" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-warmgray-800">{i.name}</span>
                          <span className="block text-xs text-warmgray-500">
                            {i.code} · Talla {i.size} {i.color && `· ${i.color}`}
                          </span>
                          <span className="font-serif font-semibold text-olive">{formatMoney(i.rental_price)}</span>
                        </span>
                        {selected && <CheckCircle2 className="size-6 shrink-0 text-olive" />}
                      </button>
                    );
                  })}
                  {!inventory.isLoading && !filteredItems.length && (
                    <p className="col-span-full rounded-xl bg-white p-4 text-center text-sm text-warmgray-500">
                      No hay prendas disponibles con ese criterio.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-warmgray-200">
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-warmgray-100">
                    {item?.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold">{item?.name}</p>
                    <p className="text-warmgray-500">Para {client?.full_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha de recojo" required error={errors.pickup_date?.message}>
                    <Input type="date" {...register("pickup_date")} />
                  </Field>
                  <Field label="Fecha de devolución" required error={errors.return_date?.message}>
                    <Input type="date" min={values.pickup_date} {...register("return_date")} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValue("return_date", addDaysISO(d, new Date(`${values.pickup_date}T12:00:00`)), { shouldValidate: true })}
                      className="h-10 rounded-full border border-warmgray-300 bg-white px-3 text-sm hover:bg-warmgray-100"
                    >
                      +{d} {d === 1 ? "día" : "días"}
                    </button>
                  ))}
                  <span className="flex h-10 items-center text-sm text-warmgray-500">Duración: {days} día(s)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio alquiler (S/)" required error={errors.total_amount?.message}>
                    <Input type="number" step="0.01" inputMode="decimal" {...register("total_amount")} />
                  </Field>
                  <Field label="Garantía (S/)" hint="Se devuelve al retornar la prenda" error={errors.deposit_amount?.message}>
                    <Input type="number" step="0.01" inputMode="decimal" {...register("deposit_amount")} />
                  </Field>
                </div>

                <div className="rounded-2xl border border-warmgray-200 bg-white p-4">
                  <p className="mb-3 font-semibold text-warmgray-800">Cobro ahora</p>
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <Field label="Monto del alquiler cobrado" error={errors.paid_now?.message}>
                      <Input type="number" step="0.01" inputMode="decimal" {...register("paid_now")} />
                    </Field>
                    <div className="flex flex-col justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setValue("paid_now", Number(values.total_amount) || 0, { shouldValidate: true })}
                        className="h-touch rounded-xl border border-dashed border-olive-300 text-sm font-medium text-olive hover:bg-olive-50"
                      >
                        Cobrar total
                      </button>
                    </div>
                  </div>
                  <PaymentMethodPicker
                    value={values.payment_method}
                    onChange={(m) => setValue("payment_method", m)}
                    amount={Number(values.paid_now || 0) + (values.deliver_now ? Number(values.deposit_amount || 0) : 0)}
                  />
                  {(values.payment_method === "Yape" || values.payment_method === "Plin" || values.payment_method === "Transferencia") && (
                    <Field label="N° de operación" className="mt-3">
                      <Input placeholder="Opcional" {...register("reference_code")} />
                    </Field>
                  )}
                  <label className="mt-4 flex min-h-touch cursor-pointer items-center gap-3 rounded-xl bg-olive-50 px-4 py-2">
                    <input type="checkbox" className="size-5 accent-[#3E4E3A]" {...register("deliver_now")} />
                    <span className="text-sm">
                      <b>Entregar la prenda ahora</b>
                      <span className="block text-warmgray-500">Se cobra la garantía y la prenda pasa a “Alquilado”. Si no, queda “Reservado”.</span>
                    </span>
                  </label>
                </div>

                <Field label="Notas" error={errors.notes?.message}>
                  <Textarea rows={2} placeholder="Ajustes, accesorios incluidos, evento…" {...register("notes")} />
                </Field>

                <div className="rounded-2xl bg-olive p-4 text-white">
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Alquiler</span>
                    <span>{formatMoney(values.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Cobrado ahora</span>
                    <span>- {formatMoney(values.paid_now)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-white/20 pt-1 font-serif text-xl font-semibold">
                    <span>Saldo</span>
                    <span>{formatMoney(Math.max(0, Number(values.total_amount || 0) - Number(values.paid_now || 0)))}</span>
                  </div>
                  {values.deliver_now && Number(values.deposit_amount) > 0 && (
                    <p className="mt-1 text-xs opacity-80">+ Garantía cobrada: {formatMoney(values.deposit_amount)}</p>
                  )}
                </div>
              </form>
            )}

            {step === 3 && created && (
              <div className="space-y-5 py-2 text-center">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                  <CheckCircle2 className="mx-auto size-16 text-olive" />
                </motion.div>
                <div>
                  <h3 className="font-serif text-2xl font-semibold text-olive">¡Alquiler registrado!</h3>
                  <p className="mt-1 text-sm text-warmgray-500">
                    {created.item?.name} para {created.client?.full_name}
                    <br />
                    Devolución: <b>{formatDate(created.return_date, "EEEE d 'de' MMMM")}</b>
                  </p>
                </div>
                <div className="rounded-2xl border border-warmgray-200 bg-white p-4 text-left text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase text-warmgray-400">Mensaje que se enviará</p>
                  <p className="text-warmgray-700">
                    {templates.rentalReminder(created.client?.full_name ?? "", created.return_date, created.item?.name ?? "prenda", businessName)}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="whatsapp" size="lg" onClick={sendReminder}>
                    <MessageCircle /> Enviar Recordatorio por WhatsApp
                  </Button>
                  <Button variant="outline" size="lg" onClick={openTicket}>
                    <Receipt /> Ver ticket
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Modal>
      <ReceiptModal open={Boolean(receipt)} onOpenChange={(o) => !o && setReceipt(null)} data={receipt} />
    </>
  );
}

function defaults(): RentalFormValues {
  return {
    client_id: "",
    inventory_id: "",
    pickup_date: todayISO(),
    return_date: addDaysISO(2),
    total_amount: 0,
    deposit_amount: 0,
    paid_now: 0,
    payment_method: "Efectivo",
    reference_code: "",
    deliver_now: true,
    notes: "",
  };
}

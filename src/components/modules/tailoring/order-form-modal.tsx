"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wand2 } from "lucide-react";
import { Button, Field, Input, Modal, MultiImageUploader, Select, Textarea } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { normalizeMeasures, tailoringService } from "@/services";
import { tailoringSchema, type TailoringFormValues } from "@/lib/validations";
import { addDaysISO, formatMoney } from "@/lib/format";
import { EMPTY_MEASURES, SERVICE_TYPES, TAILORING_STATUSES, type Client, type TailoringOrderWithClient } from "@/types";
import { ClientPicker } from "../shared/client-picker";
import { MeasuresForm } from "../shared/measures-form";
import { PaymentMethodPicker } from "../shared/payment-method-picker";

const toForm = (o?: TailoringOrderWithClient | null): TailoringFormValues => ({
  client_id: o?.client_id ?? "",
  service_type: o?.service_type ?? "Confección a Medida",
  garment_description: o?.garment_description ?? "",
  delivery_date: o?.delivery_date ?? addDaysISO(7),
  total_price: o?.total_price ?? 0,
  advance_payment: o?.advance_payment ?? 0,
  payment_method: "Efectivo",
  status: o?.status ?? "Recibido",
  specific_measures: normalizeMeasures(o?.specific_measures),
});

export function OrderFormModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order?: TailoringOrderWithClient | null;
}) {
  const [client, setClient] = useState<Client | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const form = useForm<TailoringFormValues>({ resolver: zodResolver(tailoringSchema), defaultValues: toForm(order) });
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset(toForm(order));
    setFiles([]);
    setRemoved([]);
    setClient(
      order?.client
        ? ({ ...order.client, email: null, dni: null, address: null, notes: null, created_at: null } as Client)
        : null,
    );
  }, [open, order, reset]);

  const save = useCrudMutation(
    async (v: TailoringFormValues) => {
      if (order) await tailoringService.update(order, v, files, removed);
      else await tailoringService.create(v, files);
    },
    { success: order ? "Orden actualizada" : "Orden de confección creada", onSuccess: () => onOpenChange(false) },
  );

  const loadClientMeasures = () => {
    if (!client?.measures) return;
    setValue("specific_measures", normalizeMeasures(client.measures), { shouldDirty: true });
  };

  const v = watch();
  const onSubmit = handleSubmit((values) => save.mutate(values));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={order ? `Orden N° ${order.order_number}` : "Nueva confección / arreglo"}
      description="Datos de la prenda, referencias, medidas y adelanto"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="accent" onClick={onSubmit} loading={save.isPending}>
            {order ? "Guardar cambios" : "Crear orden"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Cliente" required error={errors.client_id?.message}>
            <ClientPicker
              value={client}
              onChange={(c) => {
                setClient(c);
                setValue("client_id", c?.id ?? "", { shouldValidate: Boolean(c) });
                if (c && !order) setValue("specific_measures", normalizeMeasures(c.measures));
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de servicio" required>
              <Select {...register("service_type")}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de entrega" required error={errors.delivery_date?.message}>
              <Input type="date" {...register("delivery_date")} />
            </Field>
          </div>
          <Field label="Descripción de la prenda" required error={errors.garment_description?.message}>
            <Textarea rows={3} placeholder="Ej. Vestido largo de gasa color vino, escote en V, con forro…" {...register("garment_description")} />
          </Field>
          <Field label="Fotos de referencia, bocetos o diseños">
            <MultiImageUploader
              existing={(order?.reference_images ?? []).filter((u) => !removed.includes(u))}
              onRemoveExisting={(u) => setRemoved((r) => [...r, u])}
              files={files}
              onFilesChange={setFiles}
              max={6}
              label="Agregar referencia"
            />
          </Field>
          {order && (
            <Field label="Estado">
              <Select {...register("status")}>
                {TAILORING_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio total (S/)" required error={errors.total_price?.message}>
              <Input type="number" step="0.01" inputMode="decimal" {...register("total_price")} />
            </Field>
            <Field
              label={order ? "Pagado a la fecha" : "Adelanto (S/)"}
              error={errors.advance_payment?.message}
              hint={`Saldo: ${formatMoney(Math.max(0, Number(v.total_price || 0) - Number(v.advance_payment || 0)))}`}
            >
              <Input type="number" step="0.01" inputMode="decimal" disabled={Boolean(order)} {...register("advance_payment")} />
            </Field>
          </div>
          {!order && Number(v.advance_payment) > 0 && (
            <PaymentMethodPicker value={v.payment_method} onChange={(m) => setValue("payment_method", m)} amount={Number(v.advance_payment)} />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-serif text-lg font-semibold text-olive">Medidas para esta prenda</p>
            {client?.measures && (
              <Button type="button" variant="soft" size="sm" onClick={loadClientMeasures}>
                <Wand2 /> Usar ficha del cliente
              </Button>
            )}
          </div>
          <MeasuresForm register={register} errors={errors} name="specific_measures" values={v.specific_measures ?? EMPTY_MEASURES} compact />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

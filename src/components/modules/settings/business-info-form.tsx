"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MapPin, Phone, Save, FileBadge2, MessageSquareQuote } from "lucide-react";
import { Button, Card, CardContent, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { useUpdateSettings } from "@/hooks/use-settings";
import { settingsSchema, type SettingsFormValues } from "@/lib/validations";
import { SAMPLE_RECEIPT } from "@/lib/receipt";
import type { BusinessSettings } from "@/types";
import { ReceiptTicket } from "../receipt/receipt-ticket";

export function BusinessInfoForm({ settings }: { settings: BusinessSettings }) {
  const update = useUpdateSettings();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toForm(settings),
  });
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => reset(toForm(settings)), [settings, reset]);

  const live = watch();
  const previewSettings: BusinessSettings = {
    ...settings,
    business_name: live.business_name || settings.business_name,
    phone: live.phone ?? null,
    address: live.address ?? null,
    ruc_dni: live.ruc_dni ?? null,
    receipt_message: live.receipt_message ?? null,
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader icon={<Building2 />} title="Datos comerciales" description="Aparecen en tickets, recibos y mensajes de WhatsApp." />
        <CardContent>
          <form onSubmit={handleSubmit((values) => update.mutate({ id: settings.id, values }))} className="space-y-4">
            <Field label="Nombre del negocio" htmlFor="business_name" required error={errors.business_name?.message}>
              <Input id="business_name" icon={<Building2 />} aria-invalid={!!errors.business_name} {...register("business_name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono / WhatsApp" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" inputMode="tel" icon={<Phone />} placeholder="987 654 321" {...register("phone")} />
              </Field>
              <Field label="RUC o DNI" htmlFor="ruc_dni" error={errors.ruc_dni?.message}>
                <Input id="ruc_dni" inputMode="numeric" icon={<FileBadge2 />} placeholder="10XXXXXXXXX" {...register("ruc_dni")} />
              </Field>
            </div>
            <Field label="Dirección" htmlFor="address" error={errors.address?.message}>
              <Input id="address" icon={<MapPin />} placeholder="Jr. Comercio 123, Catacaos - Piura" {...register("address")} />
            </Field>
            <Field
              label="Leyenda de comprobantes"
              htmlFor="receipt_message"
              hint="Mensaje de cierre impreso al pie de cada ticket."
              error={errors.receipt_message?.message}
            >
              <div className="relative">
                <MessageSquareQuote className="pointer-events-none absolute left-3.5 top-3.5 size-[18px] text-warmgray-400" />
                <Textarea id="receipt_message" className="pl-11" rows={3} {...register("receipt_message")} />
              </div>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={update.isPending} disabled={!isDirty} className="w-full sm:w-auto">
                <Save /> Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-warmgray-500">Vista previa en vivo</p>
        <div className="rounded-2xl bg-warmgray-200/60 py-5">
          <div className="origin-top scale-[0.92]">
            <ReceiptTicket data={SAMPLE_RECEIPT} settings={previewSettings} showQr={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function toForm(s: BusinessSettings): SettingsFormValues {
  return {
    business_name: s.business_name ?? "Taller de Costura Marisol",
    phone: s.phone ?? "",
    address: s.address ?? "",
    ruc_dni: s.ruc_dni ?? "",
    receipt_message: s.receipt_message ?? "",
  };
}

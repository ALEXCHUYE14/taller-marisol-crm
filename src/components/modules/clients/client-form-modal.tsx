"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ruler, User } from "lucide-react";
import { Button, Field, Input, Modal, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { clientsService, normalizeMeasures } from "@/services";
import { clientSchema, type ClientFormValues } from "@/lib/validations";
import { EMPTY_MEASURES, type Client } from "@/types";
import { MeasuresForm } from "../shared/measures-form";

const toForm = (c?: Client | null): ClientFormValues => ({
  full_name: c?.full_name ?? "",
  phone: c?.phone ?? "",
  email: c?.email ?? "",
  dni: c?.dni ?? "",
  address: c?.address ?? "",
  notes: c?.notes ?? "",
  measures: c ? normalizeMeasures(c.measures) : { ...EMPTY_MEASURES },
});

export function ClientFormModal({
  open,
  onOpenChange,
  client,
  initialTab = "datos",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client?: Client | null;
  initialTab?: "datos" | "medidas";
}) {
  const form = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema), defaultValues: toForm(client) });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (open) reset(toForm(client));
  }, [open, client, reset]);

  const save = useCrudMutation(
    (values: ClientFormValues) => (client ? clientsService.update(client.id, values) : clientsService.create(values)),
    { success: client ? "Cliente actualizado" : "Cliente registrado", onSuccess: () => onOpenChange(false) },
  );

  const onSubmit = handleSubmit((v) => save.mutate(v));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={client ? "Editar cliente" : "Nuevo cliente"}
      description="Datos de contacto y ficha técnica de medidas"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={save.isPending}>
            Guardar cliente
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <Tabs defaultValue={initialTab} key={`${open}-${initialTab}`}>
          <TabsList className="w-full">
            <TabsTrigger value="datos">
              <User /> Datos
            </TabsTrigger>
            <TabsTrigger value="medidas">
              <Ruler /> Ficha de medidas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="datos" className="space-y-4">
            <Field label="Nombre completo" required error={errors.full_name?.message}>
              <Input autoFocus placeholder="Nombres y apellidos" {...register("full_name")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Celular" required error={errors.phone?.message}>
                <Input inputMode="tel" placeholder="987654321" {...register("phone")} />
              </Field>
              <Field label="DNI" error={errors.dni?.message}>
                <Input inputMode="numeric" {...register("dni")} />
              </Field>
            </div>
            <Field label="Correo" error={errors.email?.message}>
              <Input type="email" inputMode="email" placeholder="opcional" {...register("email")} />
            </Field>
            <Field label="Dirección" error={errors.address?.message}>
              <Input {...register("address")} />
            </Field>
            <Field label="Notas" hint="Preferencias, tallas habituales, observaciones." error={errors.notes?.message}>
              <Textarea rows={3} {...register("notes")} />
            </Field>
          </TabsContent>
          <TabsContent value="medidas">
            <MeasuresForm register={register} errors={errors} name="measures" values={watch("measures")} />
          </TabsContent>
        </Tabs>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

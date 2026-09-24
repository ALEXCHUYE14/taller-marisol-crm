"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Modal, MultiImageUploader, Select } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { inventoryService } from "@/services";
import { inventorySchema, type InventoryFormValues } from "@/lib/validations";
import { INVENTORY_CATEGORIES, INVENTORY_STATUSES, type InventoryItem } from "@/types";

const toForm = (i?: InventoryItem | null): InventoryFormValues => ({
  code: i?.code ?? "",
  name: i?.name ?? "",
  category: i?.category ?? "Terno Completo",
  size: i?.size ?? "",
  color: i?.color ?? "",
  rental_price: i?.rental_price ?? 0,
  guarantee_price: i?.guarantee_price ?? 0,
  status: i?.status ?? "Disponible",
});

export function InventoryFormModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: InventoryItem | null;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryFormValues>({ resolver: zodResolver(inventorySchema), defaultValues: toForm(item) });

  useEffect(() => {
    if (open) {
      reset(toForm(item));
      setFiles([]);
      setRemoved([]);
    }
  }, [open, item, reset]);

  const save = useCrudMutation(
    (values: InventoryFormValues) =>
      item ? inventoryService.update(item, values, files, removed) : inventoryService.create(values, files),
    { success: item ? "Prenda actualizada" : "Prenda agregada al catálogo", onSuccess: () => onOpenChange(false) },
  );
  const onSubmit = handleSubmit((v) => save.mutate(v));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? `Editar ${item.code}` : "Nueva prenda de alquiler"}
      description="Fotos, precio de alquiler y garantía"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={save.isPending}>
            {save.isPending && files.length ? "Subiendo fotos…" : "Guardar prenda"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <MultiImageUploader
          existing={(item?.images ?? []).filter((u) => !removed.includes(u))}
          onRemoveExisting={(u) => setRemoved((r) => [...r, u])}
          files={files}
          onFilesChange={setFiles}
          label="Fotos de la prenda"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código" required error={errors.code?.message}>
            <Input placeholder="TRN-001" className="uppercase" {...register("code")} />
          </Field>
          <Field label="Categoría" required error={errors.category?.message}>
            <Select {...register("category")}>
              {INVENTORY_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Nombre / descripción" required error={errors.name?.message}>
          <Input placeholder="Terno clásico azul marino" {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Talla" required error={errors.size?.message}>
            <Input placeholder="40 / M" {...register("size")} />
          </Field>
          <Field label="Color" error={errors.color?.message}>
            <Input placeholder="Azul" {...register("color")} />
          </Field>
          <Field label="Estado" className="col-span-2 sm:col-span-1">
            <Select {...register("status")}>
              {INVENTORY_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio alquiler (S/)" required error={errors.rental_price?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...register("rental_price")} />
          </Field>
          <Field label="Garantía (S/)" error={errors.guarantee_price?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...register("guarantee_price")} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Modal, MultiImageUploader, Select } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { limaToday } from "@/lib/cash";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations";
import { expensesService } from "@/services";
import { MANUAL_EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from "@/types";

const toForm = (e?: Expense | null): ExpenseFormValues => ({
  expense_date: e?.expense_date ?? limaToday(),
  category: (MANUAL_EXPENSE_CATEGORIES as readonly string[]).includes(e?.category ?? "")
    ? (e!.category as ExpenseFormValues["category"])
    : "Tela",
  description: e?.description ?? "",
  amount: e?.amount ?? (undefined as unknown as number),
  payment_method: e?.payment_method ?? "Efectivo",
});

/** Alta / edición de un egreso (compra de tela, insumos, servicios, sueldos…) */
export function ExpenseFormModal({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expense?: Expense | null;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseSchema), defaultValues: toForm(expense) });

  useEffect(() => {
    if (open) {
      reset(toForm(expense));
      setFiles([]);
      setReceiptRemoved(false);
    }
  }, [open, expense, reset]);

  const save = useCrudMutation(
    async (values: ExpenseFormValues) => {
      if (expense) await expensesService.update(expense, values, { newFile: files[0] ?? null, removeReceipt: receiptRemoved });
      else await expensesService.create(values, files[0] ?? null);
    },
    { success: expense ? "Egreso actualizado" : "Egreso registrado", onSuccess: () => onOpenChange(false) },
  );
  const onSubmit = handleSubmit((v) => save.mutate(v));

  const existingReceipt = expense?.receipt_url && !receiptRemoved ? [expense.receipt_url] : [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? "Editar egreso" : "Registrar egreso"}
      description="Compras y gastos del taller: tela, hilos, servicios, sueldos…"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={save.isPending}>
            {save.isPending && files.length ? "Subiendo foto…" : expense ? "Guardar cambios" : "Registrar egreso"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Categoría" required error={errors.category?.message}>
            <Select {...register("category")}>
              {MANUAL_EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Monto (S/)" required error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" inputMode="decimal" placeholder="0.00" {...register("amount")} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fecha" required error={errors.expense_date?.message}>
            <Input type="date" max={limaToday()} {...register("expense_date")} />
          </Field>
          <Field label="Pagado con" required error={errors.payment_method?.message}>
            <Select {...register("payment_method")}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Detalle" hint="Ej.: 5 m de gabardina azul, hilo, luz del mes…" error={errors.description?.message}>
          <Input placeholder="Opcional" {...register("description")} />
        </Field>
        <Field label="Foto del comprobante" hint="Boleta, factura o recibo (opcional)">
          <MultiImageUploader
            existing={existingReceipt}
            onRemoveExisting={() => setReceiptRemoved(true)}
            files={files}
            onFilesChange={(f) => setFiles(f.slice(-1))}
            max={1}
            label="Agregar foto"
          />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

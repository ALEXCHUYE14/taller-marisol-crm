"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { useCrudMutation } from "@/hooks/use-data";
import { formatDayLong } from "@/lib/cash";
import { formatMoney } from "@/lib/format";
import { expensesService } from "@/services";
import { GUARANTEE_REFUND_CATEGORY, type Expense } from "@/types";

export function ExpensesTab({
  expenses,
  total,
  onNew,
  onEdit,
}: {
  expenses: Expense[];
  /** Total de egresos operativos del periodo (sin devoluciones de garantía) */
  total: number;
  onNew: () => void;
  onEdit: (e: Expense) => void;
}) {
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const remove = useCrudMutation((e: Expense) => expensesService.remove(e), {
    success: "Egreso eliminado",
    onSuccess: () => setDeleting(null),
  });

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) map.set(e.expense_date, [...(map.get(e.expense_date) ?? []), e]);
    return [...map.entries()];
  }, [expenses]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-warmgray-600">
          Gastos del periodo: <b className="text-base text-terracotta-600">{formatMoney(total)}</b>
        </p>
        <Button variant="accent" onClick={onNew}>
          <Plus /> Registrar egreso
        </Button>
      </div>

      {!groups.length ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Sin egresos en este periodo"
          description="Registra la compra de tela, hilos, servicios o sueldos para conocer tu utilidad real."
          action={
            <Button variant="accent" onClick={onNew}>
              <Plus /> Registrar egreso
            </Button>
          }
        />
      ) : (
        groups.map(([day, rows]) => (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h3 className="font-serif text-base font-semibold first-letter:uppercase text-warmgray-800">{formatDayLong(day)}</h3>
              <span className="shrink-0 text-sm font-semibold text-terracotta-600">
                {formatMoney(rows.filter((r) => r.category !== GUARANTEE_REFUND_CATEGORY).reduce((s, r) => s + Number(r.amount), 0))}
              </span>
            </div>
            <ul className="divide-y divide-warmgray-100 overflow-hidden rounded-2xl border border-warmgray-200 bg-white shadow-soft">
              {rows.map((e) => {
                const refund = e.category === GUARANTEE_REFUND_CATEGORY;
                return (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-3 sm:px-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={refund ? "amber" : "terracotta"}>{e.category}</Badge>
                        <Badge tone="gray">{e.payment_method}</Badge>
                      </div>
                      {e.description && <p className="mt-1.5 line-clamp-2 break-words text-sm text-warmgray-700">{e.description}</p>}
                      {refund && <p className="mt-1 text-xs text-warmgray-500">Devuelve dinero del cliente; no cuenta como gasto.</p>}
                      {e.receipt_url && (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-olive hover:underline"
                        >
                          <ImageIcon className="size-4" /> Ver comprobante
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={refund ? "text-base font-semibold text-warmgray-500" : "text-base font-semibold text-terracotta-600"}>
                        −{formatMoney(Number(e.amount))}
                      </span>
                      <div className="flex gap-1">
                        {!refund && (
                          <Button size="icon-sm" variant="ghost" aria-label="Editar egreso" onClick={() => onEdit(e)}>
                            <Pencil />
                          </Button>
                        )}
                        <Button size="icon-sm" variant="ghost" aria-label="Eliminar egreso" onClick={() => setDeleting(e)} className="text-burgundy hover:bg-burgundy-50">
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Eliminar egreso"
        description={
          deleting
            ? `Se eliminará ${deleting.category} por ${formatMoney(Number(deleting.amount))}. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}

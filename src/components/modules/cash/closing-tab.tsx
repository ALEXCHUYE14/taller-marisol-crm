"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, LockKeyhole, LockKeyholeOpen, TrendingDown, TrendingUp } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, ConfirmDialog, Field, Input, Skeleton, Textarea } from "@/components/ui";
import { useClosing, useClosings, useExpenses, useIncomes, usePreviousClosing } from "@/hooks/use-cash";
import { useCrudMutation } from "@/hooks/use-data";
import { cashDifference, closingDrift, dayTotals, expectedCash, formatDayLong, formatDayYear, limaDateOf, limaTimeOf, round2 } from "@/lib/cash";
import { formatMoney } from "@/lib/format";
import { cashService, isMissingCajaSetup } from "@/services";
import { cn, getErrorMessage } from "@/lib/utils";
import type { CashClosing } from "@/types";
import { ErrorNote, SetupNotice, signedMoney } from "./shared";

/** Convierte lo escrito ("12,50" o "12.50") en número; null si está vacío o es inválido. */
const parseAmount = (raw: string): number | null => {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? round2(n) : null;
};

export function ClosingTab({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const history = useClosings();

  // Si la pantalla quedó abierta de un día para otro y el día elegido ya es futuro, vuelve a hoy
  const safeDate = date > today ? today : date;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid grid-cols-1 items-end gap-3 pt-4 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <Field label="Día a cerrar">
            <Input type="date" max={today} value={safeDate} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <p className="text-sm first-letter:uppercase text-warmgray-600">{formatDayLong(safeDate)}</p>
        </CardContent>
      </Card>

      <DayClosing key={safeDate} date={safeDate} />

      {history.data && history.data.length > 0 && (
        <Card>
          <CardHeader title="Cierres anteriores" description="Toca uno para ver su detalle" />
          <CardContent>
            <ul className="divide-y divide-warmgray-100 rounded-xl border border-warmgray-200">
              {history.data.map((c) => {
                const diff = Number(c.difference);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setDate(c.closing_date)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-warmgray-100/60"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium first-letter:uppercase text-warmgray-800">{formatDayYear(c.closing_date)}</span>
                        <span className="block text-xs text-warmgray-500">
                          Esperado {formatMoney(Number(c.expected_cash))} · Contado {formatMoney(Number(c.counted_cash))}
                        </span>
                      </span>
                      <DiffBadge diff={diff} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.005) return <Badge tone="olive">Cuadra</Badge>;
  return <Badge tone={diff > 0 ? "amber" : "burgundy"}>{diff > 0 ? `Sobra ${formatMoney(diff)}` : `Falta ${formatMoney(-diff)}`}</Badge>;
}

// ---------------------------------------------------------------------------
// Un día concreto: abierto (para cerrar) o cerrado (para revisar / reabrir)
// ---------------------------------------------------------------------------
function DayClosing({ date }: { date: string }) {
  const range = useMemo(() => ({ from: date, to: date }), [date]);
  const incomes = useIncomes(range);
  const expenses = useExpenses(range);
  const closing = useClosing(date);
  const previous = usePreviousClosing(date);

  const setupMissing = [incomes.error, expenses.error, closing.error].some(isMissingCajaSetup);
  const firstError = incomes.error ?? expenses.error ?? closing.error;

  if (setupMissing) return <SetupNotice />;
  if (firstError) return <ErrorNote message={getErrorMessage(firstError)} />;
  if (!incomes.data || !expenses.data || closing.data === undefined) return <Skeleton className="h-72" />;

  const totals = dayTotals(date, incomes.data, expenses.data);

  return closing.data ? (
    <ClosedDay closing={closing.data} live={totals} />
  ) : (
    <OpenDay date={date} totals={totals} suggestedOpening={previous.data ? Number(previous.data.counted_cash) : 0} />
  );
}

type Totals = ReturnType<typeof dayTotals>;

function OpenDay({ date, totals, suggestedOpening }: { date: string; totals: Totals; suggestedOpening: number }) {
  const [openingRaw, setOpeningRaw] = useState<string | null>(null); // null = usar el sugerido
  const [countedRaw, setCountedRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(false);

  const opening = parseAmount(openingRaw ?? String(suggestedOpening)) ?? 0;
  const counted = parseAmount(countedRaw);
  const expected = expectedCash(opening, totals);
  const diff = counted === null ? null : cashDifference(counted, expected);

  const close = useCrudMutation(
    () => cashService.closeDay({ date, openingCash: opening, countedCash: counted ?? 0, expectedSeen: expected, notes }),
    { success: "Caja cerrada", onSuccess: () => setConfirm(false) },
  );

  // Si falló porque cambiaron los montos, se cierra el diálogo para que revise
  useEffect(() => {
    if (close.isError) setConfirm(false);
  }, [close.isError]);

  const dayNet = round2(totals.incomeTotal - totals.expensesTotal);
  const digital = Object.entries(totals.byMethod).filter(([m, v]) => m !== "Efectivo" && v > 0);
  const fundoInvalido = openingRaw !== null && parseAmount(openingRaw) === null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat icon={<TrendingUp />} label="Ingresos del día" value={formatMoney(totals.incomeTotal)} />
        <MiniStat icon={<TrendingDown />} label="Egresos del día" value={formatMoney(totals.expensesTotal)} tone="terracotta" />
        <MiniStat label="Utilidad del día" value={formatMoney(dayNet)} tone={dayNet < 0 ? "burgundy" : "olive"} />
      </div>

      <Card>
        <CardHeader
          icon={<LockKeyholeOpen />}
          title="Arqueo de efectivo"
          description="Cuenta el dinero físico de la caja y compáralo con lo que debería haber"
        />
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <Row label="Cobrado en efectivo (incluye garantías)" value={formatMoney(totals.cashIn)} />
            <Row label="Pagado en efectivo (gastos y garantías devueltas)" value={`−${formatMoney(totals.cashOut)}`} />
          </div>

          <Field
            label="Fondo inicial (sencillo con el que abriste)"
            hint={openingRaw === null && suggestedOpening > 0 ? "Sugerido: lo que contaste al cerrar el último día" : undefined}
            error={fundoInvalido ? "Ingresa un monto válido" : undefined}
          >
            <Input
              type="text"
              inputMode="decimal"
              value={openingRaw ?? String(suggestedOpening)}
              onChange={(e) => setOpeningRaw(e.target.value)}
              aria-invalid={fundoInvalido}
            />
          </Field>

          <div className="flex items-baseline justify-between gap-3 rounded-2xl bg-olive-50 px-4 py-3">
            <span className="font-medium text-olive">Efectivo esperado en caja</span>
            <span className="font-serif text-2xl font-semibold text-olive">{formatMoney(expected)}</span>
          </div>

          <Field label="Efectivo contado (S/)" required hint="Cuenta billetes y monedas y escribe el total">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={countedRaw}
              onChange={(e) => setCountedRaw(e.target.value)}
              className="text-lg font-semibold"
              aria-invalid={countedRaw.trim() !== "" && counted === null}
            />
          </Field>

          {countedRaw.trim() !== "" && counted === null && <p className="text-xs font-medium text-burgundy">Ingresa un monto válido (solo números).</p>}

          {diff !== null && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3",
                Math.abs(diff) < 0.005 ? "border-olive-200 bg-olive-50 text-olive" : diff > 0 ? "border-amber-100 bg-amber-50 text-amber-700" : "border-burgundy-100 bg-burgundy-50 text-burgundy",
              )}
            >
              {Math.abs(diff) < 0.005 ? <CheckCircle2 className="size-6 shrink-0" /> : <AlertTriangle className="size-6 shrink-0" />}
              <div>
                <p className="font-semibold">
                  {Math.abs(diff) < 0.005 ? "La caja cuadra" : diff > 0 ? `Sobra ${formatMoney(diff)}` : `Falta ${formatMoney(-diff)}`}
                </p>
                <p className="text-xs opacity-80">Contado {formatMoney(counted ?? 0)} − esperado {formatMoney(expected)}</p>
              </div>
            </div>
          )}

          <Field label="Observaciones">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: retiré S/ 50 para pasajes; falta un sencillo…" />
          </Field>
        </CardContent>
      </Card>

      {digital.length > 0 && (
        <Card>
          <CardHeader title="Cobros digitales del día" description="No están en la caja: verifícalos en tu app o cuenta" />
          <CardContent className="space-y-2 text-sm">
            {digital.map(([m, v]) => (
              <Row key={m} label={m} value={formatMoney(v)} />
            ))}
          </CardContent>
        </Card>
      )}

      {close.isError && <ErrorNote message={getErrorMessage(close.error)} />}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {counted === null && <p className="text-xs text-warmgray-500">Escribe el efectivo contado para poder cerrar.</p>}
        <Button size="lg" disabled={counted === null || fundoInvalido} onClick={() => setConfirm(true)}>
          <LockKeyhole /> Cerrar caja del día
        </Button>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="¿Cerrar la caja?"
        description={`Se guardará el cierre de ${formatDayYear(date)}${
          diff === null ? "" : Math.abs(diff) < 0.005 ? " (la caja cuadra)" : diff > 0 ? ` (sobran ${formatMoney(diff)})` : ` (faltan ${formatMoney(-diff)})`
        }. No podrás editarlo ni cambiar los egresos de ese día, salvo que lo reabras.`}
        confirmLabel="Cerrar caja"
        loading={close.isPending}
        onConfirm={() => close.mutate(undefined)}
      />
    </div>
  );
}

function ClosedDay({ closing, live }: { closing: CashClosing; live: Totals }) {
  const [reopen, setReopen] = useState(false);
  const undo = useCrudMutation(() => cashService.reopenDay(closing.id), {
    success: "Día reabierto",
    onSuccess: () => setReopen(false),
  });
  const drift = closingDrift(closing, live);
  const diff = Number(closing.difference);
  const byMethod = Object.entries(closing.by_method ?? {}).filter(([, v]) => Number(v) > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-olive-200 bg-olive-50 px-4 py-3 text-olive">
        <LockKeyhole className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Día cerrado</p>
          <p className="opacity-80">
            {closing.created_at ? `Cerrado el ${formatDayYear(limaDateOf(closing.created_at))} a las ${limaTimeOf(closing.created_at)}. ` : ""}
            El cierre no se puede editar.
          </p>
        </div>
      </div>

      {drift.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" /> Hubo movimientos después del cierre
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {drift.map((d) => (
              <li key={d.label}>
                {d.label}: {signedMoney(d.diff)}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs">Reabre el día para volver a contar y cerrar con los montos actualizados.</p>
        </div>
      )}

      <Card>
        <CardHeader icon={<LockKeyhole />} title="Resumen del cierre" action={<DiffBadge diff={diff} />} />
        <CardContent className="space-y-2 text-sm">
          <Row label="Ingresos del taller" value={formatMoney(Number(closing.income_total))} />
          <Row label="Egresos" value={`−${formatMoney(Number(closing.expenses_total))}`} />
          <Row label="Utilidad del día" value={formatMoney(round2(Number(closing.income_total) - Number(closing.expenses_total)))} bold />
          <div className="my-2 border-t border-warmgray-100" />
          <Row label="Garantías cobradas" value={formatMoney(Number(closing.guarantees_in))} />
          <Row label="Garantías devueltas" value={`−${formatMoney(Number(closing.guarantees_out))}`} />
          <div className="my-2 border-t border-warmgray-100" />
          <Row label="Fondo inicial" value={formatMoney(Number(closing.opening_cash))} />
          <Row label="Efectivo cobrado" value={formatMoney(Number(closing.cash_in))} />
          <Row label="Efectivo pagado" value={`−${formatMoney(Number(closing.cash_out))}`} />
          <Row label="Efectivo esperado" value={formatMoney(Number(closing.expected_cash))} bold />
          <Row label="Efectivo contado" value={formatMoney(Number(closing.counted_cash))} bold />
          {closing.notes && <p className="mt-2 rounded-xl bg-warmgray-100/70 p-3 text-warmgray-700">{closing.notes}</p>}
        </CardContent>
      </Card>

      {byMethod.length > 0 && (
        <Card>
          <CardHeader title="Cobros del día por medio de pago" />
          <CardContent className="space-y-2 text-sm">
            {byMethod.map(([m, v]) => (
              <Row key={m} label={m} value={formatMoney(Number(v))} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setReopen(true)}>
          <LockKeyholeOpen /> Reabrir día
        </Button>
      </div>

      <ConfirmDialog
        open={reopen}
        onOpenChange={setReopen}
        title="Reabrir el día"
        description="Se eliminará este cierre y podrás editar los egresos de ese día y volver a cerrar la caja."
        confirmLabel="Reabrir día"
        danger
        loading={undo.isPending}
        onConfirm={() => undo.mutate(undefined)}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", bold && "font-semibold text-warmgray-800")}>
      <span className={cn("min-w-0", bold ? "" : "text-warmgray-600")}>{label}</span>
      <span className={cn("shrink-0", bold ? "text-base" : "font-medium text-warmgray-800")}>{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = "olive",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "olive" | "terracotta" | "burgundy";
}) {
  const color = tone === "terracotta" ? "text-terracotta-600" : tone === "burgundy" ? "text-burgundy" : "text-olive";
  return (
    <div className="rounded-2xl border border-warmgray-200 bg-white p-3 shadow-soft sm:p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-warmgray-600 [&_svg]:size-4">
        {icon}
        {label}
      </p>
      <p className={cn("mt-1 font-serif text-2xl font-semibold", color)}>{value}</p>
    </div>
  );
}

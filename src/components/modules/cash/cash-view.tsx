"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, PageHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useExpenses, useIncomes } from "@/hooks/use-cash";
import { useSettings } from "@/hooks/use-settings";
import { limaToday, periodRange, shiftAnchor, summarize, type DateRange, type PeriodKind } from "@/lib/cash";
import { buildMovements, downloadMovementsCsv, downloadSummaryPdf } from "@/lib/cash-export";
import { getErrorMessage } from "@/lib/utils";
import { isMissingCajaSetup } from "@/services";
import type { Expense } from "@/types";
import { ClosingTab } from "./closing-tab";
import { ExpenseFormModal } from "./expense-form-modal";
import { ExpensesTab } from "./expenses-tab";
import { IncomesTab } from "./incomes-tab";
import { PeriodFilter, clampRange } from "./period-filter";
import { ReceivablesTab } from "./receivables-tab";
import { ErrorNote, SetupNotice } from "./shared";
import { SummaryTab } from "./summary-tab";

/**
 * La fecha de "hoy" (hora de Lima) se calcula solo en el navegador: si se calculara en el servidor,
 * cerca de la medianoche podría diferir y provocar diferencias al hidratar la página.
 */
export function CashView() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setToday(limaToday());
    update();
    // Si la app queda abierta de un día para otro, "hoy" se actualiza al volver a ella
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  if (!today) {
    return (
      <>
        <PageHeader title="Caja" subtitle="Ingresos, egresos y cierre diario" />
        <Skeleton className="h-64" />
      </>
    );
  }
  return <CashContent today={today} />;
}

function CashContent({ today }: { today: string }) {
  const { data: settings } = useSettings();
  const [tab, setTab] = useState("resumen");
  const [kind, setKind] = useState<PeriodKind>("hoy");
  const [anchor, setAnchor] = useState<string | null>(null); // null = periodo actual
  const [custom, setCustom] = useState<DateRange | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const current = anchor ?? today;
  const range: DateRange = kind === "rango" ? clampRange(custom ?? { from: today, to: today }) : periodRange(kind, current);
  const isCurrent = kind === "rango" || (range.from <= today && today <= range.to);

  const incomes = useIncomes(range);
  const expenses = useExpenses(range);
  const expensesMissing = isMissingCajaSetup(expenses.error);

  const summary = useMemo(
    () => (incomes.data && (expenses.data || expensesMissing) ? summarize(range, incomes.data, expenses.data ?? []) : null),
    // range es un objeto nuevo en cada render: se depende de sus extremos
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incomes.data, expenses.data, expensesMissing, range.from, range.to],
  );

  const changeKind = (k: PeriodKind) => {
    setKind(k);
    setAnchor(null);
    if (k === "rango") setCustom(range); // el calendario parte del periodo que se estaba viendo
  };

  const move = (dir: 1 | -1) => {
    if (kind === "rango") return;
    const next = shiftAnchor(kind, current, dir);
    if (next > today) return; // no hay periodos futuros
    const r = periodRange(kind, next);
    setAnchor(r.from <= today && today <= r.to ? null : next);
  };

  const openNew = () => {
    if (expensesMissing) return setTab("egresos");
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setFormOpen(true);
  };

  const exportCsv = () => {
    if (!incomes.data) return;
    setExporting("csv");
    try {
      downloadMovementsCsv(buildMovements(incomes.data, expenses.data ?? []), range);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setExporting(null);
    }
  };
  const exportPdf = async () => {
    if (!incomes.data || !summary) return;
    setExporting("pdf");
    try {
      await downloadSummaryPdf({
        business: settings?.business_name ?? "Taller de Costura Marisol",
        kind,
        range,
        summary,
        movements: buildMovements(incomes.data, expenses.data ?? []),
      });
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${getErrorMessage(e)}`);
    } finally {
      setExporting(null);
    }
  };

  const showFilter = tab === "resumen" || tab === "ingresos" || tab === "egresos";
  const loading = incomes.isLoading || (expenses.isLoading && !expensesMissing);
  const failure = incomes.error ?? (expensesMissing ? null : expenses.error);

  return (
    <>
      <PageHeader
        title="Caja"
        subtitle="Ingresos, egresos y cierre diario"
        actions={
          // En la pestaña Egresos el botón ya está dentro de la pestaña: no se duplica
          tab !== "egresos" && (
            <Button variant="accent" onClick={openNew}>
              <Plus /> Registrar egreso
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
          <TabsTrigger value="cobrar">Por cobrar</TabsTrigger>
          <TabsTrigger value="cierre">Cierre</TabsTrigger>
        </TabsList>

        {showFilter && (
          <div className="mt-4">
            <PeriodFilter
              kind={kind}
              onKind={changeKind}
              range={range}
              today={today}
              isCurrent={isCurrent}
              onPrev={() => move(-1)}
              onNext={() => move(1)}
              onToday={() => setAnchor(null)}
              custom={custom ?? range}
              onCustom={setCustom}
            />
          </div>
        )}

        <TabsContent value="resumen">
          {failure ? (
            <ErrorNote message={getErrorMessage(failure)} />
          ) : loading || !summary ? (
            <Skeleton className="h-64" />
          ) : (
            <SummaryTab summary={summary} expensesUnavailable={expensesMissing} onCsv={exportCsv} onPdf={exportPdf} exporting={exporting} />
          )}
        </TabsContent>

        <TabsContent value="ingresos">
          {incomes.error ? <ErrorNote message={getErrorMessage(incomes.error)} /> : !incomes.data ? <Skeleton className="h-64" /> : <IncomesTab incomes={incomes.data} />}
        </TabsContent>

        <TabsContent value="egresos">
          {expensesMissing ? (
            <SetupNotice />
          ) : expenses.error ? (
            <ErrorNote message={getErrorMessage(expenses.error)} />
          ) : !expenses.data || !summary ? (
            <Skeleton className="h-64" />
          ) : (
            <ExpensesTab expenses={expenses.data} total={summary.expenses.total} onNew={openNew} onEdit={openEdit} />
          )}
        </TabsContent>

        <TabsContent value="cobrar">
          <ReceivablesTab />
        </TabsContent>

        <TabsContent value="cierre">
          <ClosingTab today={today} />
        </TabsContent>
      </Tabs>

      <ExpenseFormModal open={formOpen} onOpenChange={setFormOpen} expense={editing} />
    </>
  );
}

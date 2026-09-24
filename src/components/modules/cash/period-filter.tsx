"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Segmented } from "@/components/ui";
import { addDays, normalizeRange, periodLabel, rangeDays, type DateRange, type PeriodKind } from "@/lib/cash";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "quincena", label: "Quincena" },
  { value: "mes", label: "Mes" },
  { value: "rango", label: "Calendario" },
];

/** Máximo de días de un rango libre (evita pedir años completos por error) */
export const MAX_RANGE_DAYS = 366;

export function clampRange(r: DateRange): DateRange {
  const n = normalizeRange(r);
  return rangeDays(n) > MAX_RANGE_DAYS ? { from: n.from, to: addDays(n.from, MAX_RANGE_DAYS - 1) } : n;
}

export function PeriodFilter({
  kind,
  onKind,
  range,
  today,
  isCurrent,
  onPrev,
  onNext,
  onToday,
  custom,
  onCustom,
}: {
  kind: PeriodKind;
  onKind: (k: PeriodKind) => void;
  range: DateRange;
  today: string;
  /** El periodo mostrado contiene a hoy */
  isCurrent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  custom: DateRange;
  onCustom: (r: DateRange) => void;
}) {
  const isRange = kind === "rango";
  const tooLong = isRange && rangeDays(normalizeRange(custom)) > MAX_RANGE_DAYS;

  return (
    <div className="space-y-3">
      <Segmented value={kind} onChange={onKind} options={OPTIONS} />

      {isRange ? (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-warmgray-200 bg-white p-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1.5 text-sm font-medium text-warmgray-700">
            Desde
            <Input type="date" max={today} value={custom.from} onChange={(e) => e.target.value && onCustom({ ...custom, from: e.target.value })} />
          </label>
          <label className="block min-w-0 space-y-1.5 text-sm font-medium text-warmgray-700">
            Hasta
            <Input type="date" max={today} value={custom.to} onChange={(e) => e.target.value && onCustom({ ...custom, to: e.target.value })} />
          </label>
          {tooLong && (
            <p className="text-xs font-medium text-amber-700 sm:col-span-2">
              El rango máximo es de {MAX_RANGE_DAYS} días; se muestran los primeros {MAX_RANGE_DAYS}.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-warmgray-200 bg-white p-2">
          <Button variant="ghost" size="icon" aria-label="Periodo anterior" onClick={onPrev}>
            <ChevronLeft />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="line-clamp-2 font-serif text-base font-semibold leading-snug first-letter:uppercase text-warmgray-800 sm:text-lg">
              {periodLabel(kind, range)}
            </p>
            {!isCurrent && (
              <button type="button" onClick={onToday} className="text-xs font-semibold text-terracotta-600 hover:underline">
                Volver a hoy
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Periodo siguiente"
            onClick={onNext}
            disabled={isCurrent}
            className={cn(isCurrent && "opacity-30")}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

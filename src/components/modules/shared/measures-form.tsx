"use client";

import { useState } from "react";
import type { FieldErrors, UseFormRegister, FieldValues, Path } from "react-hook-form";
import { Ruler } from "lucide-react";
import { MEASURE_FIELDS, type Measures } from "@/types";
import { cn } from "@/lib/utils";

type MeasureKey = keyof Measures;

/** Guías visuales sobre la silueta (coordenadas en viewBox 200x400) */
const GUIDES: Record<MeasureKey, { type: "h" | "v"; x1: number; y1: number; x2: number; y2: number }> = {
  cuello: { type: "h", x1: 86, y1: 62, x2: 114, y2: 62 },
  hombros: { type: "h", x1: 58, y1: 78, x2: 142, y2: 78 },
  pecho: { type: "h", x1: 62, y1: 108, x2: 138, y2: 108 },
  cintura: { type: "h", x1: 68, y1: 150, x2: 132, y2: 150 },
  cadera: { type: "h", x1: 64, y1: 186, x2: 136, y2: 186 },
  talle_frente: { type: "v", x1: 88, y1: 78, x2: 88, y2: 150 },
  talle_espalda: { type: "v", x1: 112, y1: 62, x2: 112, y2: 150 },
  largo_manga: { type: "v", x1: 50, y1: 80, x2: 34, y2: 200 },
  largo_pantalon: { type: "v", x1: 124, y1: 150, x2: 124, y2: 372 },
  tiro: { type: "v", x1: 100, y1: 150, x2: 100, y2: 206 },
};

function Silhouette({ active }: { active: MeasureKey | null }) {
  const g = active ? GUIDES[active] : null;
  return (
    <svg viewBox="0 0 200 400" className="h-full w-full" aria-hidden>
      <g fill="#F3F1EC" stroke="#B3AC9F" strokeWidth="2" strokeLinejoin="round">
        <circle cx="100" cy="36" r="22" />
        <path d="M86 56 L86 66 Q72 72 58 78 L44 150 L38 204 L50 206 L60 150 L66 120 L66 186 L70 376 L94 376 L98 210 L102 210 L106 376 L130 376 L134 186 L134 120 L140 150 L150 206 L162 204 L156 150 L142 78 Q128 72 114 66 L114 56 Z" />
      </g>
      {g && (
        <g>
          <line
            x1={g.x1}
            y1={g.y1}
            x2={g.x2}
            y2={g.y2}
            stroke="#D27C5A"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="6 5"
          >
            <animate attributeName="stroke-dashoffset" from="22" to="0" dur="0.8s" repeatCount="indefinite" />
          </line>
          <circle cx={g.x1} cy={g.y1} r="4.5" fill="#D27C5A" />
          <circle cx={g.x2} cy={g.y2} r="4.5" fill="#D27C5A" />
        </g>
      )}
    </svg>
  );
}

interface MeasuresFormProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  /** Prefijo del campo en el formulario, p.ej. "measures" o "specific_measures" */
  name: string;
  values?: Partial<Measures>;
  compact?: boolean;
}

/**
 * Ficha de Medidas interactiva: al enfocar un campo se resalta en la silueta
 * dónde tomar la medida. Pensada para tablet/celular (teclado numérico, 48px).
 */
export function MeasuresForm<T extends FieldValues>({ register, errors, name, values, compact }: MeasuresFormProps<T>) {
  const [active, setActive] = useState<MeasureKey | null>(null);
  const activeField = MEASURE_FIELDS.find((f) => f.key === active);
  const fieldErrors = (errors as Record<string, Record<string, { message?: string }> | undefined> | undefined)?.[name];
  const filled = values ? Object.values(values).filter((v) => v && String(v).trim()).length : 0;

  return (
    <div className={cn("grid grid-cols-1 gap-4", !compact && "md:grid-cols-[200px_minmax(0,1fr)]")}>
      <div className={cn("relative rounded-2xl border border-warmgray-200 bg-white p-3", compact ? "hidden" : "hidden md:block")}>
        <div className="h-[340px]">
          <Silhouette active={active} />
        </div>
        <div className="mt-2 min-h-[44px] text-center text-xs">
          {activeField ? (
            <>
              <p className="font-semibold text-terracotta-600">{activeField.label}</p>
              <p className="text-warmgray-500">{activeField.hint}</p>
            </>
          ) : (
            <p className="text-warmgray-500">Toca un campo para ver dónde medir</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-warmgray-700">
            <Ruler className="size-4 text-terracotta" /> Medidas en centímetros
          </p>
          {values && (
            <span className="rounded-full bg-olive-50 px-2.5 py-0.5 text-xs font-semibold text-olive">
              {filled}/{MEASURE_FIELDS.length}
            </span>
          )}
        </div>
        {(["Torso", "Brazos", "Piernas"] as const).map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-warmgray-400">{group}</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {MEASURE_FIELDS.filter((f) => f.group === group).map((f) => {
                const err = fieldErrors?.[f.key]?.message;
                return (
                  <label
                    key={f.key}
                    className={cn(
                      "relative flex flex-col rounded-xl border bg-white px-3 pb-1.5 pt-2 transition-all",
                      active === f.key ? "border-terracotta ring-2 ring-terracotta/20" : "border-warmgray-300",
                      err && "border-burgundy",
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-warmgray-500">{f.label}</span>
                    <span className="flex items-baseline gap-1">
                      <input
                        inputMode="decimal"
                        placeholder="—"
                        className="h-8 w-full bg-transparent text-lg font-semibold text-warmgray-800 outline-none placeholder:text-warmgray-300"
                        onFocus={() => setActive(f.key)}
                        {...register(`${name}.${f.key}` as Path<T>, { onBlur: () => setActive(null) })}
                      />
                      <span className="text-xs text-warmgray-400">cm</span>
                    </span>
                    {err && <span className="text-[11px] text-burgundy">{err}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

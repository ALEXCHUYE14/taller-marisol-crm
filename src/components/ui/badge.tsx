import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
  {
    variants: {
      tone: {
        olive: "bg-olive-50 text-olive-700 ring-olive-200",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
        burgundy: "bg-burgundy-50 text-burgundy-700 ring-burgundy-100",
        terracotta: "bg-terracotta-50 text-terracotta-600 ring-terracotta-100",
        gray: "bg-warmgray-100 text-warmgray-600 ring-warmgray-200",
        blue: "bg-sky-50 text-sky-700 ring-sky-100",
      },
    },
    defaultVariants: { tone: "gray" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {props.children}
    </span>
  );
}

/** Colores semánticos: Verde oliva (disponible/ok), Ámbar (en proceso), Borgoña (vencido/urgente) */
const STATUS_TONE: Record<string, BadgeTone> = {
  // Inventario
  Disponible: "olive",
  Alquilado: "amber",
  Reservado: "terracotta",
  "En Mantenimiento": "blue",
  Baja: "gray",
  // Alquileres
  Entregado: "amber",
  Devuelto: "olive",
  "Con Retraso": "burgundy",
  Cancelado: "gray",
  // Garantía
  Retenida: "amber",
  Devuelta: "olive",
  "Retenida por Daño": "burgundy",
  // Confección
  Recibido: "gray",
  "En Corte": "amber",
  "En Costura": "amber",
  "Prueba Pendiente": "terracotta",
  "Listo para Entregar": "olive",
};

export function StatusBadge({ status, className, context }: { status: string | null; className?: string; context?: "order" }) {
  const label = status ?? "—";
  // En confección, "Entregado" es un estado final positivo
  const tone = context === "order" && status === "Entregado" ? "olive" : STATUS_TONE[label] ?? "gray";
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, ArrowRight, Banknote, CalendarClock, MessageCircle, Scissors, Shirt, Smartphone, Wallet } from "lucide-react";
import { Button, Card, CardContent, CardHeader, EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { useDashboard } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { formatMoney, relativeDayLabel, todayISO } from "@/lib/format";
import { openWhatsApp, templates } from "@/lib/whatsapp";
import { getErrorMessage, cn } from "@/lib/utils";
import type { RentalWithRelations } from "@/types";
import { IncomeChart, OrdersFlowChart } from "./charts";
import { KpiCard } from "./kpi-card";
import { QuickActions, QuickActionsFab } from "./quick-actions-fab";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export function DashboardView() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { data: settings } = useSettings();
  const business = settings?.business_name ?? "Taller Marisol";

  const remind = (r: RentalWithRelations) =>
    openWhatsApp(
      r.client?.phone,
      r.status === "Con Retraso"
        ? templates.rentalOverdue(r.client?.full_name ?? "", r.return_date, r.item?.name ?? "prenda", business)
        : templates.rentalReminder(r.client?.full_name ?? "", r.return_date, r.item?.name ?? "prenda", business),
    );

  return (
    <>
      <div className="mb-5">
        <p className="text-sm text-warmgray-500 first-letter:uppercase">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
        <h1 className="font-serif text-2xl font-semibold text-olive sm:text-3xl">{greeting()}, Sra. Marisol</h1>
      </div>

      <QuickActions />

      {error && (
        <EmptyState
          className="mt-5"
          icon={<AlertTriangle />}
          title="No se pudo cargar el dashboard"
          description={getErrorMessage(error)}
          action={<Button onClick={() => refetch()}>Reintentar</Button>}
        />
      )}

      {isLoading && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Alquileres por vencer"
              icon={<CalendarClock />}
              tone={data.rentalsOverdue.length ? "burgundy" : "amber"}
              alert={data.rentalsOverdue.length > 0}
              value={data.rentalsDue.length + data.rentalsOverdue.length}
              sub={
                <span>
                  {data.rentalsDue.length} hoy/mañana
                  {data.rentalsOverdue.length > 0 && (
                    <b className="ml-1 text-burgundy">· {data.rentalsOverdue.length} vencidos</b>
                  )}
                </span>
              }
            />
            <KpiCard
              label="Entregas de confección hoy"
              icon={<Scissors />}
              tone={data.ordersLate.length ? "burgundy" : "terracotta"}
              alert={data.ordersLate.length > 0}
              value={data.ordersDueToday.length}
              sub={
                data.ordersLate.length ? (
                  <b className="text-burgundy">{data.ordersLate.length} atrasadas</b>
                ) : (
                  "Prendas que la Sra. Marisol debe terminar hoy"
                )
              }
              delay={0.05}
            />
            <KpiCard
              label="Caja chica · flujo del día"
              icon={<Wallet />}
              value={formatMoney(data.cash.total)}
              delay={0.1}
              sub={`${data.cash.count} movimiento(s) · Disponibles ${data.inventoryAvailable}/${data.inventoryTotal} prendas`}
            >
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { k: "Yape", icon: <Smartphone />, cls: "text-[#742284] bg-[#F3E8F5]" },
                  { k: "Efectivo", icon: <Banknote />, cls: "text-olive bg-olive-50" },
                  { k: "Plin", icon: <Smartphone />, cls: "text-[#00A5B8] bg-[#E0F6F8]" },
                ].map(({ k, icon, cls }) => (
                  <div key={k} className={cn("rounded-xl px-2 py-2 text-center [&_svg]:mx-auto [&_svg]:size-4", cls)}>
                    {icon}
                    <p className="mt-0.5 text-[11px] font-semibold">{k}</p>
                    <p className="text-sm font-bold">{formatMoney(data.cash.byMethod[k] ?? 0)}</p>
                  </div>
                ))}
              </div>
            </KpiCard>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* Alerta visual de trajes que deben regresar */}
            <Card>
              <CardHeader
                icon={<Shirt />}
                title="Trajes que deben regresar"
                description="Vencidos, hoy y mañana"
                action={
                  <Link href="/alquileres" className="flex h-10 shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-terracotta-600">
                    Ver todo <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <CardContent className="space-y-2">
                {[...data.rentalsOverdue, ...data.rentalsDue].length === 0 ? (
                  <p className="rounded-xl bg-olive-50 p-4 text-center text-sm text-olive">Todo en orden: no hay devoluciones pendientes 🎉</p>
                ) : (
                  [...data.rentalsOverdue, ...data.rentalsDue].map((r) => {
                    const overdue = r.status === "Con Retraso";
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-2.5",
                          overdue ? "border-burgundy-100 bg-burgundy-50/60" : "border-amber-100 bg-amber-50/60",
                        )}
                      >
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-white">
                          {r.item?.images?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.item.images[0]} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-warmgray-800">{r.client?.full_name}</p>
                          <p className="truncate text-xs text-warmgray-600">{r.item?.name}</p>
                          <p className={cn("text-xs font-bold", overdue ? "text-burgundy" : "text-amber-700")}>
                            {overdue ? `Vencido · ${relativeDayLabel(r.return_date)}` : `Devuelve ${relativeDayLabel(r.return_date).toLowerCase()}`}
                          </p>
                        </div>
                        <Button size="icon" variant="whatsapp" aria-label="Enviar recordatorio" onClick={() => remind(r)}>
                          <MessageCircle />
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Lista de prendas a terminar hoy */}
            <Card>
              <CardHeader
                icon={<Scissors />}
                title="Para terminar hoy"
                description="Órdenes con entrega hoy y atrasadas"
                action={
                  <Link href="/confecciones" className="flex h-10 shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-terracotta-600">
                    Tablero <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <CardContent className="space-y-2">
                {[...data.ordersLate, ...data.ordersDueToday].length === 0 ? (
                  <p className="rounded-xl bg-olive-50 p-4 text-center text-sm text-olive">Sin entregas urgentes para hoy.</p>
                ) : (
                  [...data.ordersLate, ...data.ordersDueToday].map((o) => {
                    const late = o.delivery_date < todayISO();
                    return (
                      <Link
                        key={o.id}
                        href="/confecciones"
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border p-3",
                          late ? "border-burgundy-100 bg-burgundy-50/60" : "border-warmgray-200 bg-white",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-warmgray-800">
                            N° {o.order_number} · {o.client?.full_name}
                          </p>
                          <p className="truncate text-xs text-warmgray-600">{o.garment_description}</p>
                          {late && <p className="text-xs font-bold text-burgundy">Atrasada · {relativeDayLabel(o.delivery_date)}</p>}
                        </div>
                        <StatusBadge status={o.status} context="order" />
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader icon={<Wallet />} title="Ingresos últimos 7 días" description="Por medio de pago" />
              <CardContent>
                <IncomeChart data={data.incomeLast7Days} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader icon={<Scissors />} title="Flujo de prendas en taller" description="Órdenes activas por etapa" />
              <CardContent>
                <OrdersFlowChart data={data.ordersByStatus} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <QuickActionsFab />
    </>
  );
}

"use client";

import { MessageCircle, Pencil, Ruler, Scissors, Shirt } from "lucide-react";
import { Button, Modal, Skeleton, StatusBadge } from "@/components/ui";
import { useClientHistory } from "@/hooks/use-data";
import { formatDate, formatMoney } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { MEASURE_FIELDS, type Client } from "@/types";

export function ClientDetailModal({
  client,
  onOpenChange,
  onEdit,
}: {
  client: Client | null;
  onOpenChange: (o: boolean) => void;
  onEdit: (c: Client, tab: "datos" | "medidas") => void;
}) {
  const history = useClientHistory(client?.id ?? null);
  if (!client) return null;
  const measures = client.measures ?? {};

  return (
    <Modal open={Boolean(client)} onOpenChange={onOpenChange} title={client.full_name} description={`${client.phone}${client.dni ? ` · DNI ${client.dni}` : ""}`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="whatsapp" onClick={() => openWhatsApp(client.phone, `Hola ${client.full_name.split(" ")[0]}, te saluda el Taller Marisol. `)}>
            <MessageCircle /> WhatsApp
          </Button>
          <Button variant="outline" onClick={() => onEdit(client, "datos")}>
            <Pencil /> Editar
          </Button>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-serif text-lg font-semibold text-olive">
              <Ruler className="size-5" /> Ficha de medidas
            </h4>
            <Button variant="link" size="sm" onClick={() => onEdit(client, "medidas")}>
              Actualizar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MEASURE_FIELDS.map((f) => {
              const v = (measures as Record<string, string>)[f.key];
              return (
                <div key={f.key} className="rounded-xl border border-warmgray-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-warmgray-500">{f.label}</p>
                  <p className="text-lg font-semibold text-warmgray-800">{v ? `${v}` : "—"}<span className="ml-0.5 text-xs font-normal text-warmgray-400">{v ? "cm" : ""}</span></p>
                </div>
              );
            })}
          </div>
          {client.notes && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{client.notes}</p>}
        </section>

        <section>
          <h4 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-olive">
            <Shirt className="size-5" /> Alquileres
          </h4>
          {history.isLoading ? (
            <Skeleton className="h-16" />
          ) : history.data?.rentals.length ? (
            <ul className="space-y-2">
              {history.data.rentals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-warmgray-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.item?.name ?? "Prenda"}</p>
                    <p className="text-xs text-warmgray-500">
                      {formatDate(r.pickup_date)} → {formatDate(r.return_date)} · {formatMoney(r.total_amount)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-warmgray-500">Sin alquileres registrados.</p>
          )}
        </section>

        <section>
          <h4 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-olive">
            <Scissors className="size-5" /> Confecciones y arreglos
          </h4>
          {history.isLoading ? (
            <Skeleton className="h-16" />
          ) : history.data?.orders.length ? (
            <ul className="space-y-2">
              {history.data.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-warmgray-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      N° {o.order_number} · {o.garment_description}
                    </p>
                    <p className="text-xs text-warmgray-500">
                      Entrega {formatDate(o.delivery_date)} · Saldo {formatMoney(o.pending_balance)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} context="order" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-warmgray-500">Sin órdenes registradas.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}

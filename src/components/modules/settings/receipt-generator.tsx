"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, Field, Select } from "@/components/ui";
import { useRentals, useTailoringOrders } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { paymentsService } from "@/services";
import { SAMPLE_RECEIPT, receiptFromOrder, receiptFromRental } from "@/lib/receipt";
import type { ReceiptData } from "@/types";
import { ReceiptTicket } from "../receipt/receipt-ticket";
import { ReceiptToolbar } from "../receipt/receipt-modal";

/** Generador de Ticket/Recibo: vista previa lista para imprimir o enviar por WhatsApp (PDF/Imagen). */
export function ReceiptGenerator() {
  const { data: settings } = useSettings();
  const rentals = useRentals("todos");
  const orders = useTailoringOrders(true);
  const [source, setSource] = useState("demo");
  const ref = useRef<HTMLDivElement>(null);

  const [kind, id] = source.split(":") as ["demo" | "rental" | "order", string | undefined];
  const payments = useQuery({
    queryKey: ["payments", source],
    queryFn: () => (kind === "rental" ? paymentsService.byRental(id!) : paymentsService.byOrder(id!)),
    enabled: kind !== "demo" && Boolean(id),
  });

  const data: ReceiptData = useMemo(() => {
    if (kind === "rental") {
      const r = rentals.data?.find((x) => x.id === id);
      if (r) return receiptFromRental(r, payments.data ?? []);
    }
    if (kind === "order") {
      const o = orders.data?.find((x) => x.id === id);
      if (o) return receiptFromOrder(o, payments.data ?? []);
    }
    return SAMPLE_RECEIPT;
  }, [kind, id, rentals.data, orders.data, payments.data]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="self-start">
        <CardHeader
          icon={<Receipt />}
          title="Generador de ticket / recibo"
          description="Elige una operación para generar su comprobante. Formato térmico de 80 mm."
        />
        <CardContent className="space-y-4">
          <Field label="Operación">
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="demo">Ticket de ejemplo</option>
              {!!rentals.data?.length && (
                <optgroup label="Alquileres recientes">
                  {rentals.data.slice(0, 40).map((r) => (
                    <option key={r.id} value={`rental:${r.id}`}>
                      {r.client?.full_name ?? "Cliente"} — {r.item?.name ?? "Prenda"} ({r.status})
                    </option>
                  ))}
                </optgroup>
              )}
              {!!orders.data?.length && (
                <optgroup label="Órdenes de confección">
                  {orders.data.slice(0, 40).map((o) => (
                    <option key={o.id} value={`order:${o.id}`}>
                      N° {o.order_number} · {o.client?.full_name ?? "Cliente"} — {o.service_type}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>
          <ReceiptToolbar data={data} targetRef={ref} />
          <ul className="space-y-1 text-xs text-warmgray-500">
            <li>• <b>Imprimir</b>: compatible con ticketeras térmicas de 80 mm vía el diálogo del navegador.</li>
            <li>• <b>WhatsApp</b>: en el celular comparte la imagen del ticket; en PC abre WhatsApp Web con el resumen.</li>
            <li>• Si hay saldo pendiente, el ticket incluye tus QR de Yape/Plin.</li>
          </ul>
        </CardContent>
      </Card>
      <div className="rounded-2xl bg-warmgray-200/60 py-6">
        <ReceiptTicket ref={ref} data={data} settings={settings} />
      </div>
    </div>
  );
}

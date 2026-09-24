import type { Payment, ReceiptData, RentalWithRelations, TailoringOrderWithClient } from "@/types";
import { formatDate, formatDateTime } from "./format";

const sum = (payments: Payment[], filter?: (p: Payment) => boolean) =>
  payments.filter(filter ?? (() => true)).reduce((s, p) => s + Number(p.amount), 0);

const lastMethod = (payments: Payment[]) => payments.at(-1)?.payment_method ?? undefined;

export function receiptFromRental(r: RentalWithRelations, payments: Payment[] = []): ReceiptData {
  const paidRental = sum(payments, (p) => p.payment_type !== "Garantía");
  const guaranteePaid = sum(payments, (p) => p.payment_type === "Garantía");
  const garment = r.item ? `${r.item.name} (${r.item.code}) · Talla ${r.item.size}` : "Prenda";
  const total = Number(r.total_amount);
  return {
    title: "CONTRATO DE ALQUILER",
    number: `ALQ-${r.id.slice(0, 6).toUpperCase()}`,
    date: formatDateTime(r.created_at ?? new Date().toISOString()),
    clientName: r.client?.full_name ?? "Cliente",
    clientPhone: r.client?.phone,
    items: [{ description: `Alquiler: ${garment}`, amount: total }],
    total,
    paid: paidRental,
    balance: Math.max(0, total - paidRental),
    paymentMethod: lastMethod(payments),
    extraLines: [
      { label: "Recojo", value: formatDate(r.pickup_date) },
      { label: "Devolución", value: formatDate(r.return_date) },
      { label: "Garantía", value: `S/ ${Number(r.deposit_amount ?? 0).toFixed(2)} (${r.guarantee_status ?? "Retenida"})` },
      ...(guaranteePaid ? [{ label: "Garantía cobrada", value: `S/ ${guaranteePaid.toFixed(2)}` }] : []),
    ],
  };
}

export function receiptFromOrder(o: TailoringOrderWithClient, payments: Payment[] = []): ReceiptData {
  const total = Number(o.total_price);
  const paid = Number(o.advance_payment ?? 0);
  return {
    title: "ORDEN DE CONFECCIÓN",
    number: `OC-${String(o.order_number).padStart(5, "0")}`,
    date: formatDateTime(o.created_at ?? new Date().toISOString()),
    clientName: o.client?.full_name ?? "Cliente",
    clientPhone: o.client?.phone,
    items: [{ description: `${o.service_type ?? "Servicio"}: ${o.garment_description}`, amount: total }],
    total,
    paid,
    balance: Math.max(0, total - paid),
    paymentMethod: lastMethod(payments),
    extraLines: [
      { label: "Entrega", value: formatDate(o.delivery_date) },
      { label: "Estado", value: o.status ?? "Recibido" },
    ],
  };
}

export const SAMPLE_RECEIPT: ReceiptData = {
  title: "CONTRATO DE ALQUILER",
  number: "ALQ-DEMO01",
  date: formatDateTime(new Date().toISOString()),
  clientName: "Cliente de ejemplo",
  clientPhone: "987654321",
  items: [{ description: "Alquiler: Terno Clásico Azul Marino (TRN-001) · Talla 40", amount: 120 }],
  total: 120,
  paid: 60,
  balance: 60,
  paymentMethod: "Yape",
  extraLines: [
    { label: "Recojo", value: formatDate(new Date().toISOString().slice(0, 10)) },
    { label: "Garantía", value: "S/ 150.00 (Retenida)" },
  ],
};

export function receiptToText(data: ReceiptData, businessName: string): string {
  const lines = [
    `*${businessName}*`,
    `${data.title} · ${data.number}`,
    `Cliente: ${data.clientName}`,
    ...data.items.map((i) => `• ${i.description}: S/ ${i.amount.toFixed(2)}`),
    ...(data.extraLines ?? []).map((l) => `${l.label}: ${l.value}`),
    `Total: S/ ${data.total.toFixed(2)}`,
    `A cuenta: S/ ${data.paid.toFixed(2)}`,
    `*Saldo: S/ ${data.balance.toFixed(2)}*`,
  ];
  return lines.join("\n");
}

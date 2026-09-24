import { forwardRef } from "react";
import type { BusinessSettings, ReceiptData } from "@/types";
import { formatMoney } from "@/lib/format";

interface Props {
  data: ReceiptData;
  settings: BusinessSettings | undefined;
  showQr?: boolean;
}

/** Ticket térmico 80 mm. Usa estilos en línea para que html-to-image lo capture idéntico. */
export const ReceiptTicket = forwardRef<HTMLDivElement, Props>(function ReceiptTicket({ data, settings, showQr = true }, ref) {
  const name = settings?.business_name ?? "Taller de Costura Marisol";
  const hasQr = showQr && data.balance > 0 && (settings?.yape_qr_url || settings?.plin_qr_url);
  return (
    <div
      id="receipt-print-area"
      ref={ref}
      className="mx-auto w-[300px] bg-white px-5 py-6 font-mono text-[12px] leading-relaxed text-neutral-900 shadow-soft"
      style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}
    >
      <div className="text-center">
        {settings?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt="" crossOrigin="anonymous" className="mx-auto mb-2 h-14 w-14 object-contain" />
        )}
        <p className="font-serif text-[16px] font-bold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
          {name}
        </p>
        {settings?.ruc_dni && <p>RUC/DNI: {settings.ruc_dni}</p>}
        {settings?.address && <p>{settings.address}</p>}
        {settings?.phone && <p>Tel/WhatsApp: {settings.phone}</p>}
      </div>

      <Divider />
      <p className="text-center font-bold">{data.title}</p>
      <p className="text-center">N° {data.number}</p>
      <p className="text-center text-[11px]">{data.date}</p>
      <Divider />

      <Row label="Cliente" value={data.clientName} />
      {data.clientPhone && <Row label="Celular" value={data.clientPhone} />}
      <Divider />

      {data.items.map((item, i) => (
        <div key={i} className="mb-1">
          <p>{item.description}</p>
          <p className="text-right">{formatMoney(item.amount)}</p>
        </div>
      ))}
      {data.extraLines?.map((l) => <Row key={l.label} label={l.label} value={l.value} />)}
      <Divider />

      <Row label="TOTAL" value={formatMoney(data.total)} bold />
      <Row label={`A cuenta${data.paymentMethod ? ` (${data.paymentMethod})` : ""}`} value={formatMoney(data.paid)} />
      <Row label="SALDO" value={formatMoney(data.balance)} bold />

      {hasQr && (
        <>
          <Divider />
          <p className="mb-2 text-center text-[11px]">Paga tu saldo escaneando:</p>
          <div className="flex justify-center gap-3">
            {settings?.yape_qr_url && <QrMini src={settings.yape_qr_url} label="Yape" color="#742284" />}
            {settings?.plin_qr_url && <QrMini src={settings.plin_qr_url} label="Plin" color="#00B5C8" />}
          </div>
        </>
      )}

      <Divider />
      <p className="text-center text-[11px] italic">{settings?.receipt_message ?? "¡Gracias por confiar en nuestro taller!"}</p>
      <p className="mt-2 text-center text-[10px] text-neutral-500">Comprobante interno · No válido como boleta electrónica</p>
    </div>
  );
});

function Divider() {
  return <div className="my-2 border-t border-dashed border-neutral-400" />;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function QrMini({ src, label, color }: { src: string; label: string; color: string }) {
  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`QR ${label}`} crossOrigin="anonymous" className="h-24 w-24 object-contain" />
      <p className="text-[11px] font-bold" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

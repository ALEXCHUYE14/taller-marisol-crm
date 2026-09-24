"use client";

import { useRef, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button, Modal, WhatsAppIcon } from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { receiptToText } from "@/lib/receipt";
import { openWhatsApp } from "@/lib/whatsapp";
import type { ReceiptData } from "@/types";
import { ReceiptTicket } from "./receipt-ticket";
import { downloadReceiptPdf, downloadReceiptPng, printReceipt, shareReceiptImage } from "./receipt-actions";

/** Barra de acciones del ticket: imprimir, PDF, imagen y WhatsApp */
export function ReceiptToolbar({ data, targetRef }: { data: ReceiptData; targetRef: React.RefObject<HTMLDivElement> }) {
  const { data: settings } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const name = settings?.business_name ?? "Taller Marisol";

  const run = async (key: string, fn: (node: HTMLDivElement) => Promise<void>) => {
    const node = targetRef.current;
    if (!node) return;
    setBusy(key);
    try {
      await fn(node);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el ticket. Revisa que las imágenes (logo/QR) carguen correctamente.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button variant="outline" loading={busy === "print"} onClick={() => run("print", printReceipt)}>
        <Printer /> Imprimir
      </Button>
      <Button variant="outline" loading={busy === "pdf"} onClick={() => run("pdf", (n) => downloadReceiptPdf(n, data.number))}>
        <FileText /> PDF
      </Button>
      <Button variant="outline" loading={busy === "png"} onClick={() => run("png", (n) => downloadReceiptPng(n, data.number))}>
        <Download /> Imagen
      </Button>
      <Button
        variant="whatsapp"
        loading={busy === "wa"}
        onClick={() =>
          run("wa", async (n) => {
            const text = receiptToText(data, name);
            const shared = await shareReceiptImage(n, data.number, text);
            if (!shared) openWhatsApp(data.clientPhone, text);
          })
        }
      >
        <WhatsAppIcon /> WhatsApp
      </Button>
    </div>
  );
}

export function ReceiptModal({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: ReceiptData | null;
}) {
  const { data: settings } = useSettings();
  const ref = useRef<HTMLDivElement>(null);
  if (!data) return null;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Ticket / Recibo"
      description="Imprime, descarga o envía por WhatsApp"
      size="md"
      footer={<ReceiptToolbar data={data} targetRef={ref} />}
    >
      <div className="rounded-2xl bg-warmgray-100 py-5">
        <ReceiptTicket ref={ref} data={data} settings={settings} />
      </div>
    </Modal>
  );
}

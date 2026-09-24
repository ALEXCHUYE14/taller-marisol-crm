"use client";

import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "@/hooks/use-settings";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";

const META: Record<PaymentMethod, { icon: React.ReactNode; color: string }> = {
  Efectivo: { icon: <Banknote />, color: "text-olive" },
  Yape: { icon: <Smartphone />, color: "text-[#742284]" },
  Plin: { icon: <Smartphone />, color: "text-[#00A5B8]" },
  Transferencia: { icon: <Landmark />, color: "text-sky-700" },
  Tarjeta: { icon: <CreditCard />, color: "text-warmgray-700" },
};

/**
 * Selector táctil del medio de pago. Si se elige Yape o Plin, muestra el QR
 * configurado en Ajustes para que el cliente lo escanee en el mostrador.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  amount,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  amount?: number;
}) {
  const { data: settings } = useSettings();
  const qr = value === "Yape" ? settings?.yape_qr_url : value === "Plin" ? settings?.plin_qr_url : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-white text-xs font-semibold transition-all [&_svg]:size-5",
              value === m ? "border-olive bg-olive-50 text-olive" : "border-warmgray-200 text-warmgray-600 hover:border-warmgray-300",
            )}
          >
            <span className={META[m].color}>{META[m].icon}</span>
            {m}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {(value === "Yape" || value === "Plin") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {qr ? (
              <div className="flex items-center gap-4 rounded-2xl border border-warmgray-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt={`QR ${value}`} className="size-28 rounded-lg object-contain" />
                <div className="text-sm">
                  <p className="font-semibold text-warmgray-800">Muestra este QR al cliente</p>
                  {amount !== undefined && amount > 0 && (
                    <p className="mt-1 font-serif text-2xl font-semibold text-olive">S/ {amount.toFixed(2)}</p>
                  )}
                  <p className="mt-1 text-xs text-warmgray-500">Anota el N° de operación como referencia.</p>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                Aún no subiste el QR de {value}. Hazlo en Ajustes → Cobro Digital.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QrCode, Smartphone, Store } from "lucide-react";
import { Card, CardContent, CardHeader, ImageDropzone, Segmented } from "@/components/ui";
import { useRemoveBusinessAsset, useUploadBusinessAsset } from "@/hooks/use-settings";
import type { BusinessAssetKind } from "@/services";
import type { BusinessSettings } from "@/types";

const BRAND = {
  yape: { name: "Yape", color: "#742284", soft: "#F3E8F5" },
  plin: { name: "Plin", color: "#00A5B8", soft: "#E0F6F8" },
} as const;

/**
 * Configuración de Cobro Digital: carga drag-and-drop de los QR de Yape y Plin
 * (bucket `business-assets`) y del logo, con previsualización en tiempo real
 * de cómo lo verá el cliente en el celular del taller.
 */
export function DigitalPaymentsSection({ settings }: { settings: BusinessSettings }) {
  const upload = useUploadBusinessAsset();
  const remove = useRemoveBusinessAsset();
  const [preview, setPreview] = useState<"yape" | "plin">("yape");
  // Vista local instantánea mientras sube (optimista)
  const [local, setLocal] = useState<Partial<Record<BusinessAssetKind, string>>>({});

  const busy = (kind: BusinessAssetKind) =>
    (upload.isPending && upload.variables?.kind === kind) || (remove.isPending && remove.variables?.kind === kind);

  const onFile = (kind: BusinessAssetKind, file: File) => {
    const url = URL.createObjectURL(file);
    setLocal((l) => ({ ...l, [kind]: url }));
    upload.mutate(
      { settings, kind, file },
      {
        onSettled: () => {
          setLocal((l) => ({ ...l, [kind]: undefined }));
          URL.revokeObjectURL(url);
        },
      },
    );
    if (kind !== "logo") setPreview(kind);
  };

  const src = {
    yape: local.yape ?? settings.yape_qr_url,
    plin: local.plin ?? settings.plin_qr_url,
    logo: local.logo ?? settings.logo_url,
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card>
          <CardHeader
            icon={<QrCode />}
            title="Configuración de cobro digital"
            description="Sube la imagen del QR que te da la app de Yape y de Plin. Se mostrará al cobrar y en los tickets."
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {(["yape", "plin"] as const).map((kind) => (
                <div key={kind} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: BRAND[kind].color }} />
                    <p className="font-semibold text-warmgray-800">QR de {BRAND[kind].name}</p>
                  </div>
                  <ImageDropzone
                    label={`Subir QR de ${BRAND[kind].name}`}
                    value={src[kind]}
                    uploading={busy(kind)}
                    onFileSelected={(f) => onFile(kind, f)}
                    onRemove={() => remove.mutate({ settings, kind })}
                    maxMb={2}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader icon={<Store />} title="Logo del negocio" description="Se usa en la barra de la app y en la cabecera de los tickets." />
          <CardContent>
            <div className="max-w-[220px]">
              <ImageDropzone
                label="Subir logo"
                value={src.logo}
                uploading={busy("logo")}
                onFileSelected={(f) => onFile("logo", f)}
                onRemove={() => remove.mutate({ settings, kind: "logo" })}
                maxMb={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Previsualización en tiempo real */}
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warmgray-500">
          <Smartphone className="size-4" /> Así lo verá tu cliente
        </p>
        <Segmented
          className="justify-center"
          value={preview}
          onChange={setPreview}
          options={[
            { value: "yape", label: "Yape" },
            { value: "plin", label: "Plin" },
          ]}
        />
        <div className="mx-auto w-[260px] rounded-[2.5rem] border-[10px] border-warmgray-800 bg-warmgray-800 shadow-lift">
          <div className="relative overflow-hidden rounded-[1.8rem] bg-white">
            <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-warmgray-800" />
            <AnimatePresence mode="wait">
              <motion.div
                key={preview}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-[460px] flex-col items-center px-5 pb-6 pt-10"
                style={{ background: `linear-gradient(180deg, ${BRAND[preview].soft} 0%, #fff 55%)` }}
              >
                {src.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src.logo} alt="" className="mb-2 size-12 rounded-xl bg-white object-contain shadow" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/icon.svg" alt="" className="mb-2 size-12 rounded-xl" />
                )}
                <p className="text-center font-serif text-[15px] font-semibold leading-tight text-warmgray-800">
                  {settings.business_name}
                </p>
                <p className="mb-4 mt-1 text-xs text-warmgray-500">Paga con {BRAND[preview].name}</p>
                <div
                  className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white p-3 shadow-soft ring-4"
                  style={{ ["--tw-ring-color" as string]: BRAND[preview].color }}
                >
                  {src[preview] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src[preview] ?? ""} alt={`QR ${BRAND[preview].name}`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-center text-warmgray-400">
                      <QrCode className="mx-auto size-16" />
                      <p className="mt-2 text-xs">Sube tu QR para verlo aquí</p>
                    </div>
                  )}
                </div>
                <p className="mt-4 font-serif text-3xl font-semibold" style={{ color: BRAND[preview].color }}>
                  S/ 120.00
                </p>
                <p className="text-xs text-warmgray-500">Monto de ejemplo</p>
                {settings.phone && (
                  <p className="mt-3 rounded-full bg-warmgray-100 px-3 py-1 text-xs text-warmgray-600">
                    Celular: {settings.phone}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

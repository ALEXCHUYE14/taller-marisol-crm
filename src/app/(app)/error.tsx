"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

/** Si una sección falla al mostrarse, en vez de quedar en blanco se ofrece reintentar. */
export default function SectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-serif text-2xl font-semibold text-olive">Algo no salió bien</p>
      <p className="max-w-sm text-sm text-warmgray-600">
        No se pudo mostrar esta sección. Tus datos están a salvo. Intenta de nuevo.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          onClick={reset}
          className="inline-flex h-touch items-center gap-2 rounded-xl bg-olive px-5 font-medium text-white hover:bg-olive-800"
        >
          <RotateCw className="size-[18px]" /> Reintentar
        </button>
        <button
          onClick={() => window.location.reload()}
          className="h-touch rounded-xl border border-warmgray-300 bg-white px-5 font-medium text-warmgray-700 hover:bg-warmgray-100"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}

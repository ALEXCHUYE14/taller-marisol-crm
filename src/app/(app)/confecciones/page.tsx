import { Suspense } from "react";
import { TailoringView } from "@/components/modules/tailoring/tailoring-view";

export const metadata = { title: "Confecciones" };

export default function ConfeccionesPage() {
  return (
    <Suspense>
      <TailoringView />
    </Suspense>
  );
}

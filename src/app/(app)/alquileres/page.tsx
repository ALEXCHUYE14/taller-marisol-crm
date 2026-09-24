import { Suspense } from "react";
import { RentalsView } from "@/components/modules/rentals/rentals-view";

export const metadata = { title: "Alquileres" };

export default function AlquileresPage() {
  return (
    <Suspense>
      <RentalsView />
    </Suspense>
  );
}

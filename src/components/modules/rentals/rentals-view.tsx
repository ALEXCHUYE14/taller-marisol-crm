"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Shirt } from "lucide-react";
import { Button, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import type { InventoryItem } from "@/types";
import { ContractsList } from "./contracts-list";
import { InventoryCatalog } from "./inventory-catalog";
import { RentalWizard } from "./rental-wizard";

export function RentalsView() {
  const params = useSearchParams();
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preselected, setPreselected] = useState<InventoryItem | null>(null);
  const [tab, setTab] = useState(params.get("tab") === "catalogo" ? "catalogo" : "contratos");

  useEffect(() => {
    if (params.get("nuevo") === "1") {
      setPreselected(null);
      setWizardOpen(true);
      router.replace("/alquileres");
    }
  }, [params, router]);

  const startRental = (item: InventoryItem | null) => {
    setPreselected(item);
    setWizardOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Alquileres"
        subtitle="Ternos, vestidos y accesorios"
        actions={
          <Button variant="accent" onClick={() => startRental(null)}>
            <Plus /> Nuevo alquiler
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contratos">
            <FileText /> Contratos
          </TabsTrigger>
          <TabsTrigger value="catalogo">
            <Shirt /> Catálogo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contratos">
          <ContractsList />
        </TabsContent>
        <TabsContent value="catalogo">
          <InventoryCatalog onRent={startRental} />
        </TabsContent>
      </Tabs>
      <RentalWizard open={wizardOpen} onOpenChange={setWizardOpen} preselectedItem={preselected} />
    </>
  );
}

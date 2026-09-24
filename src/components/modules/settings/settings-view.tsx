"use client";

import { Building2, QrCode, Receipt } from "lucide-react";
import { EmptyState, PageHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { getErrorMessage } from "@/lib/utils";
import { BusinessInfoForm } from "./business-info-form";
import { DigitalPaymentsSection } from "./digital-payments-section";
import { ReceiptGenerator } from "./receipt-generator";

export function SettingsView() {
  const { data, isLoading, error } = useSettings();

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Datos del negocio, cobro digital y comprobantes" />
      {isLoading && <Skeleton className="h-96" />}
      {error && <EmptyState title="No se pudo cargar la configuración" description={getErrorMessage(error)} />}
      {data && (
        <Tabs defaultValue="negocio">
          <TabsList>
            <TabsTrigger value="negocio">
              <Building2 /> Negocio
            </TabsTrigger>
            <TabsTrigger value="cobro">
              <QrCode /> Cobro digital
            </TabsTrigger>
            <TabsTrigger value="ticket">
              <Receipt /> Ticket
            </TabsTrigger>
          </TabsList>
          <TabsContent value="negocio">
            <BusinessInfoForm settings={data} />
          </TabsContent>
          <TabsContent value="cobro">
            <DigitalPaymentsSection settings={data} />
          </TabsContent>
          <TabsContent value="ticket">
            <ReceiptGenerator />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

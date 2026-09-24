"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Scissors, Search } from "lucide-react";
import { Button, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui";
import { useTailoringOrders } from "@/hooks/use-data";
import { queryKeys } from "@/hooks/query-keys";
import type { TailoringOrderWithClient } from "@/types";
import { KanbanBoard } from "./kanban-board";
import { OrderDetailModal } from "./order-detail-modal";
import { OrderFormModal } from "./order-form-modal";

export function TailoringView() {
  const params = useSearchParams();
  const router = useRouter();
  const [showDelivered, setShowDelivered] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useTailoringOrders(showDelivered);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TailoringOrderWithClient | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("nuevo") === "1") {
      setEditing(null);
      setFormOpen(true);
      router.replace("/confecciones");
    }
  }, [params, router]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (data ?? []).filter(
      (o) => !t || `${o.order_number} ${o.client?.full_name ?? ""} ${o.garment_description}`.toLowerCase().includes(t),
    );
  }, [data, search]);

  const detail = data?.find((o) => o.id === detailId) ?? null;

  return (
    <>
      <PageHeader
        title="Confecciones"
        subtitle="Tablero de avance del taller"
        actions={
          <Button variant="accent" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus /> Nueva confección
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input icon={<Search />} placeholder="Buscar por cliente, N° o prenda" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex h-touch cursor-pointer items-center gap-2 rounded-xl border border-warmgray-300 bg-white px-4 text-sm">
          <input type="checkbox" className="size-5 accent-[#3E4E3A]" checked={showDelivered} onChange={(e) => setShowDelivered(e.target.checked)} />
          Mostrar entregados
        </label>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<Scissors />}
          title="No hay órdenes en el taller"
          description="Registra confecciones a medida, arreglos y transformaciones."
          action={<Button onClick={() => setFormOpen(true)}>Crear orden</Button>}
        />
      ) : (
        <KanbanBoard
          orders={filtered}
          showDelivered={showDelivered}
          onOpen={(o) => setDetailId(o.id)}
          queryKey={queryKeys.tailoring(showDelivered)}
        />
      )}

      <OrderFormModal open={formOpen} onOpenChange={setFormOpen} order={editing} />
      <OrderDetailModal
        order={detail}
        onClose={() => setDetailId(null)}
        onEdit={(o) => {
          setDetailId(null);
          setEditing(o);
          setFormOpen(true);
        }}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImageOff, Pencil, Plus, Search, Shirt, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Input, Segmented, Select, Skeleton, StatusBadge } from "@/components/ui";
import { useCrudMutation, useInventory, useInventoryFacets } from "@/hooks/use-data";
import { inventoryService, type InventoryFilters } from "@/services";
import { formatMoney } from "@/lib/format";
import { INVENTORY_CATEGORIES, type InventoryItem, type InventoryStatus } from "@/types";
import { cn } from "@/lib/utils";
import { InventoryFormModal } from "./inventory-form-modal";

export function InventoryCatalog({ onRent }: { onRent: (item: InventoryItem) => void }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<InventoryFilters>({ category: "", size: "", color: "", status: "" });
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search })), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useInventory(filters);
  const facets = useInventoryFacets();
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<InventoryItem | null>(null);

  const remove = useCrudMutation((i: InventoryItem) => inventoryService.remove(i), {
    success: "Prenda eliminada",
    onSuccess: () => setToDelete(null),
  });

  const set = <K extends keyof InventoryFilters>(k: K, v: InventoryFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input icon={<Search />} placeholder="Buscar por nombre o código" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant={showFilters ? "soft" : "outline"} size="icon" onClick={() => setShowFilters((s) => !s)} aria-label="Filtros">
          <SlidersHorizontal />
        </Button>
        <Button variant="accent" onClick={() => { setEditing(null); setFormOpen(true); }} className="hidden sm:inline-flex">
          <Plus /> Nueva prenda
        </Button>
        <Button variant="accent" size="icon" onClick={() => { setEditing(null); setFormOpen(true); }} className="sm:hidden" aria-label="Nueva prenda">
          <Plus />
        </Button>
      </div>

      {/* Filtro rápido: disponibilidad */}
      <Segmented<InventoryStatus | "">
        value={filters.status ?? ""}
        onChange={(v) => set("status", v)}
        options={[
          { value: "", label: "Todas" },
          { value: "Disponible", label: "Disponibles" },
          { value: "Reservado", label: "Reservadas" },
          { value: "Alquilado", label: "Alquiladas" },
          { value: "En Mantenimiento", label: "Mantenimiento" },
        ]}
      />

      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-2 rounded-2xl border border-warmgray-200 bg-white p-3 sm:grid-cols-3">
          <Select value={filters.category} onChange={(e) => set("category", e.target.value as InventoryFilters["category"])}>
            <option value="">Todas las categorías</option>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select value={filters.size} onChange={(e) => set("size", e.target.value)}>
            <option value="">Todas las tallas</option>
            {facets.data?.sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={filters.color} onChange={(e) => set("color", e.target.value)}>
            <option value="">Todos los colores</option>
            {facets.data?.colors.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon={<Shirt />} title="No hay prendas con esos filtros" description="Agrega ternos, vestidos y accesorios con sus fotos." action={<Button onClick={() => setFormOpen(true)}>Agregar prenda</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {data.map((item, i) => {
            const cover = item.images?.[0];
            const available = item.status === "Disponible";
            return (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex flex-col overflow-hidden rounded-2xl border border-warmgray-200 bg-white shadow-soft"
              >
                <div className="relative aspect-[4/5] bg-warmgray-100">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-warmgray-300">
                      <ImageOff className="size-10" />
                    </div>
                  )}
                  <StatusBadge status={item.status} className="absolute left-2 top-2 bg-white/95" />
                  {(item.images?.length ?? 0) > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-warmgray-800/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                      +{(item.images?.length ?? 1) - 1}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-warmgray-400">
                    {item.code} · {item.category}
                  </p>
                  <p className="line-clamp-2 font-semibold leading-snug text-warmgray-800">{item.name}</p>
                  <p className="mt-0.5 text-xs text-warmgray-500">
                    Talla <b>{item.size}</b>
                    {item.color && ` · ${item.color}`}
                  </p>
                  <div className="mt-auto flex items-end justify-between pt-2">
                    <div>
                      <p className="font-serif text-lg font-semibold text-olive">{formatMoney(item.rental_price)}</p>
                      <p className="text-[11px] text-warmgray-500">Garantía {formatMoney(item.guarantee_price)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" variant={available ? "primary" : "outline"} disabled={!available} className={cn("flex-1")} onClick={() => onRent(item)}>
                      Alquilar
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Editar" onClick={() => { setEditing(item); setFormOpen(true); }}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Eliminar" className="text-burgundy" onClick={() => setToDelete(item)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <InventoryFormModal open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar prenda"
        description={`¿Eliminar ${toDelete?.name ?? ""} (${toDelete?.code ?? ""}) y sus fotos?`}
        confirmLabel="Eliminar"
        danger
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </div>
  );
}

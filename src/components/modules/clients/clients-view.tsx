"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone, Plus, Ruler, Search, Trash2, Users } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui";
import { useClients, useCrudMutation } from "@/hooks/use-data";
import { clientsService } from "@/services";
import { openWhatsApp } from "@/lib/whatsapp";
import type { Client } from "@/types";
import { ClientFormModal } from "./client-form-modal";
import { ClientDetailModal } from "./client-detail-modal";

export function ClientsView() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useClients(debounced);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [tab, setTab] = useState<"datos" | "medidas">("datos");
  const [detail, setDetail] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const remove = useCrudMutation((c: Client) => clientsService.remove(c.id), {
    success: "Cliente eliminado",
    onSuccess: () => setToDelete(null),
  });

  const openForm = (c: Client | null, t: "datos" | "medidas" = "datos") => {
    setEditing(c);
    setTab(t);
    setDetail(null);
    setFormOpen(true);
  };

  const measuredCount = (c: Client) => Object.values(c.measures ?? {}).filter((v) => v && String(v).trim()).length;

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={data ? `${data.length} clientes registrados` : "Cartera de clientes y fichas de medidas"}
        actions={
          <Button variant="accent" onClick={() => openForm(null)}>
            <Plus /> Nuevo cliente
          </Button>
        }
      />
      <div className="mb-4">
        <Input icon={<Search />} placeholder="Buscar por nombre, celular o DNI…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<Users />}
          title={debounced ? "Sin resultados" : "Aún no hay clientes"}
          description={debounced ? "Prueba con otro nombre o número." : "Registra a tu primer cliente con su ficha de medidas."}
          action={<Button onClick={() => openForm(null)}>Registrar cliente</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c, i) => {
            const m = measuredCount(c);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="rounded-2xl border border-warmgray-200 bg-white p-4 shadow-soft"
              >
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setDetail(c)}>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-olive-50 font-serif text-lg font-semibold text-olive">
                    {c.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-warmgray-800">{c.full_name}</span>
                    <span className="flex items-center gap-1 text-sm text-warmgray-500">
                      <Phone className="size-3.5" /> {c.phone}
                    </span>
                  </span>
                </button>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1 text-xs font-medium ${m ? "text-olive" : "text-warmgray-400"}`}>
                    <Ruler className="size-3.5" /> {m ? `${m}/10 medidas` : "Sin medidas"}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label="Medidas" onClick={() => openForm(c, "medidas")}>
                      <Ruler />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="WhatsApp" className="text-[#1eb858]" onClick={() => openWhatsApp(c.phone, `Hola ${c.full_name.split(" ")[0]}, `)}>
                      <MessageCircle />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Eliminar" className="text-burgundy" onClick={() => setToDelete(c)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <ClientFormModal open={formOpen} onOpenChange={setFormOpen} client={editing} initialTab={tab} />
      <ClientDetailModal client={detail} onOpenChange={(o) => !o && setDetail(null)} onEdit={openForm} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar cliente"
        description={`Se eliminará a ${toDelete?.full_name ?? ""} junto con sus alquileres y órdenes. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </>
  );
}

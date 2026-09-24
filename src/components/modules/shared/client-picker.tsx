"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Phone, Search, UserPlus, X } from "lucide-react";
import { Button, Field, Input, Skeleton } from "@/components/ui";
import { useClients, useCrudMutation } from "@/hooks/use-data";
import { clientsService } from "@/services";
import { quickClientSchema, type QuickClientFormValues } from "@/lib/validations";
import type { Client } from "@/types";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Buscar cliente existente o crear uno rápido (nombre + celular) sin salir del flujo. */
export function ClientPicker({ value, onChange }: { value: Client | null; onChange: (c: Client | null) => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const debounced = useDebounced(search);
  const { data, isLoading } = useClients(debounced);

  const form = useForm<QuickClientFormValues>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: { full_name: "", phone: "", dni: "" },
  });
  const create = useCrudMutation((v: QuickClientFormValues) => clientsService.create(v), {
    success: "Cliente registrado",
    invalidate: [["clients"]],
    onSuccess: (client) => {
      onChange(client);
      setCreating(false);
      form.reset();
    },
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-olive bg-olive-50 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-olive text-white">
            <Check className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-warmgray-800">{value.full_name}</p>
            <p className="text-sm text-warmgray-500">{value.phone}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <form
        onSubmit={(e) => {
          e.stopPropagation();
          void form.handleSubmit((v) => create.mutate(v))(e);
        }}
        className="space-y-3 rounded-2xl border border-terracotta-200 bg-terracotta-50/50 p-4"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-warmgray-800">Nuevo cliente rápido</p>
          <button type="button" onClick={() => setCreating(false)} className="flex size-10 items-center justify-center rounded-full hover:bg-white" aria-label="Cancelar">
            <X className="size-5" />
          </button>
        </div>
        <Field label="Nombre completo" required error={form.formState.errors.full_name?.message}>
          <Input autoFocus placeholder="Ej. Carlos Mendoza" {...form.register("full_name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Celular" required error={form.formState.errors.phone?.message}>
            <Input inputMode="tel" placeholder="987654321" {...form.register("phone")} />
          </Field>
          <Field label="DNI" error={form.formState.errors.dni?.message}>
            <Input inputMode="numeric" placeholder="Opcional" {...form.register("dni")} />
          </Field>
        </div>
        <Button type="submit" variant="accent" block loading={create.isPending}>
          Guardar y seleccionar
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            icon={<Search />}
            placeholder="Buscar por nombre, celular o DNI"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="soft" size="icon" onClick={() => setCreating(true)} aria-label="Nuevo cliente">
          <UserPlus />
        </Button>
      </div>
      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        {data?.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "flex min-h-touch w-full items-center gap-3 rounded-xl border border-warmgray-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-olive-300 hover:bg-olive-50",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terracotta-50 font-serif font-semibold text-terracotta-600">
              {c.full_name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-warmgray-800">{c.full_name}</span>
              <span className="flex items-center gap-1 text-xs text-warmgray-500">
                <Phone className="size-3" /> {c.phone} {c.dni && `· DNI ${c.dni}`}
              </span>
            </span>
          </button>
        ))}
        {!isLoading && data?.length === 0 && (
          <div className="rounded-xl bg-white p-4 text-center text-sm text-warmgray-500">
            No hay coincidencias.{" "}
            <button type="button" className="font-semibold text-terracotta-600" onClick={() => {
              form.setValue("full_name", /\d/.test(search) ? "" : search);
              form.setValue("phone", /\d/.test(search) ? search : "");
              setCreating(true);
            }}>
              Crear cliente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

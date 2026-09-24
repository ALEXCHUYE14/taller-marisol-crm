"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clientsService,
  dashboardService,
  inventoryService,
  paymentsService,
  rentalsService,
  tailoringService,
  type InventoryFilters,
  type RentalListFilter,
} from "@/services";
import { getErrorMessage } from "@/lib/utils";
import { queryKeys } from "./query-keys";

// ---------- Queries ----------
export const useDashboard = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: dashboardService.get, refetchInterval: 5 * 60_000 });

export const useClients = (search = "") =>
  useQuery({ queryKey: queryKeys.clients(search), queryFn: () => clientsService.list(search) });

export const useClientHistory = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.clientHistory(id ?? ""),
    queryFn: () => clientsService.history(id as string),
    enabled: Boolean(id),
  });

export const useInventory = (filters: InventoryFilters) =>
  useQuery({ queryKey: queryKeys.inventory(filters), queryFn: () => inventoryService.list(filters) });

export const useAvailableInventory = () =>
  useQuery({ queryKey: queryKeys.inventoryAvailable, queryFn: inventoryService.listAvailable });

export const useInventoryFacets = () =>
  useQuery({ queryKey: queryKeys.inventoryFacets, queryFn: inventoryService.facets, staleTime: 60_000 });

export const useRentals = (filter: RentalListFilter) =>
  useQuery({ queryKey: queryKeys.rentals(filter), queryFn: () => rentalsService.list(filter) });

export const useTailoringOrders = (includeDelivered = false) =>
  useQuery({
    queryKey: queryKeys.tailoring(includeDelivered),
    queryFn: () => tailoringService.list({ includeDelivered }),
  });

export const useRecentPayments = (limit = 15) =>
  useQuery({ queryKey: queryKeys.payments(`recent-${limit}`), queryFn: () => paymentsService.listRecent(limit) });

// ---------- Mutación genérica con invalidación + toast ----------
const ALL_DATA_KEYS: QueryKey[] = [
  ["dashboard"],
  ["clients"],
  ["client-history"],
  ["inventory"],
  ["rentals"],
  ["tailoring"],
  ["payments"],
  ["caja"],
];

export function useCrudMutation<TVars, TResult = unknown>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  options: { success?: string | ((r: TResult, v: TVars) => string); invalidate?: QueryKey[]; onSuccess?: (r: TResult, v: TVars) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result, vars) => {
      await Promise.all((options.invalidate ?? ALL_DATA_KEYS).map((queryKey) => qc.invalidateQueries({ queryKey })));
      const msg = typeof options.success === "function" ? options.success(result, vars) : options.success;
      if (msg) toast.success(msg);
      options.onSuccess?.(result, vars);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

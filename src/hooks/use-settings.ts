"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsService, type BusinessAssetKind } from "@/services";
import type { BusinessSettings } from "@/types";
import type { SettingsFormValues } from "@/lib/validations";
import { getErrorMessage } from "@/lib/utils";
import { queryKeys } from "./query-keys";

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: settingsService.get, staleTime: 5 * 60_000 });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SettingsFormValues }) => settingsService.update(id, values),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings, data);
      toast.success("Datos comerciales guardados");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUploadBusinessAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settings, kind, file }: { settings: BusinessSettings; kind: BusinessAssetKind; file: File }) =>
      settingsService.uploadAsset(settings, kind, file),
    onSuccess: (data, { kind }) => {
      qc.setQueryData(queryKeys.settings, data);
      toast.success(kind === "logo" ? "Logo actualizado" : `QR de ${kind === "yape" ? "Yape" : "Plin"} actualizado`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRemoveBusinessAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settings, kind }: { settings: BusinessSettings; kind: BusinessAssetKind }) =>
      settingsService.removeAsset(settings, kind),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings, data);
      toast.success("Imagen eliminada");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

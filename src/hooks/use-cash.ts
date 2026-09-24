"use client";

import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/lib/cash";
import { cashService, expensesService, isMissingCajaSetup } from "@/services";
import { queryKeys } from "./query-keys";

/** No reintentar cuando falta ejecutar caja.sql: el resultado no va a cambiar. */
const retry = (failures: number, error: unknown) => !isMissingCajaSetup(error) && failures < 1;

export const useIncomes = (range: DateRange) =>
  useQuery({ queryKey: queryKeys.caja.incomes(range), queryFn: () => cashService.incomes(range), retry });

export const useExpenses = (range: DateRange) =>
  useQuery({ queryKey: queryKeys.caja.expenses(range), queryFn: () => expensesService.list(range), retry });

export const useClosing = (date: string) =>
  useQuery({ queryKey: queryKeys.caja.closing(date), queryFn: () => cashService.getClosing(date), retry });

export const usePreviousClosing = (date: string) =>
  useQuery({ queryKey: queryKeys.caja.previousClosing(date), queryFn: () => cashService.previousClosing(date), retry });

export const useClosings = () =>
  useQuery({ queryKey: queryKeys.caja.closings, queryFn: () => cashService.listClosings(30), retry });

export const useReceivables = () =>
  useQuery({ queryKey: queryKeys.caja.receivables, queryFn: () => cashService.receivables(), retry });

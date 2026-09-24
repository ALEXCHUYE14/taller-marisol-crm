import { getSupabase } from "@/lib/supabase/client";
import { limaToday, type DateRange } from "@/lib/cash";
import type { ExpenseFormValues } from "@/lib/validations";
import { GUARANTEE_REFUND_CATEGORY, type Expense, type PaymentMethod } from "@/types";
import { fetchAllPages } from "./pagination";
import { storageService } from "./storage.service";

const BUCKET = "expense-receipts" as const;
const nullIfEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const expensesService = {
  /** Egresos de un rango de fechas (inclusivo), del más reciente al más antiguo. */
  async list(range: DateRange): Promise<Expense[]> {
    return fetchAllPages<Expense>((from, to) =>
      getSupabase()
        .from("expenses")
        .select("*")
        .gte("expense_date", range.from)
        .lte("expense_date", range.to)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
  },

  async create(values: ExpenseFormValues, file?: File | null): Promise<Expense> {
    const receipt = file ? await storageService.uploadImage(BUCKET, file, "comprobantes") : null;
    const { data, error } = await getSupabase()
      .from("expenses")
      .insert({
        expense_date: values.expense_date,
        category: values.category,
        description: nullIfEmpty(values.description),
        amount: values.amount,
        payment_method: values.payment_method,
        receipt_url: receipt,
      })
      .select("*")
      .single();
    if (error) {
      await storageService.removeByUrls(BUCKET, [receipt]);
      throw error;
    }
    return data;
  },

  /** Devolución de garantía al cliente: sale dinero de la caja pero no cuenta como gasto del taller. */
  async createGuaranteeRefund(input: {
    rentalId: string;
    amount: number;
    method: PaymentMethod;
    description: string;
    /** Fecha del egreso (por defecto hoy, hora de Lima) */
    date?: string;
  }): Promise<Expense> {
    const { data, error } = await getSupabase()
      .from("expenses")
      .insert({
        expense_date: input.date ?? limaToday(),
        category: GUARANTEE_REFUND_CATEGORY,
        description: input.description,
        amount: input.amount,
        payment_method: input.method,
        rental_id: input.rentalId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    expense: Expense,
    values: ExpenseFormValues,
    options: { newFile?: File | null; removeReceipt?: boolean } = {},
  ): Promise<void> {
    const uploaded = options.newFile ? await storageService.uploadImage(BUCKET, options.newFile, "comprobantes") : null;
    const replacing = Boolean(uploaded) || Boolean(options.removeReceipt);
    const { error } = await getSupabase()
      .from("expenses")
      .update({
        expense_date: values.expense_date,
        category: values.category,
        description: nullIfEmpty(values.description),
        amount: values.amount,
        payment_method: values.payment_method,
        ...(replacing ? { receipt_url: uploaded } : {}),
      })
      .eq("id", expense.id);
    if (error) {
      await storageService.removeByUrls(BUCKET, [uploaded]);
      throw error;
    }
    if (replacing) await storageService.removeByUrls(BUCKET, [expense.receipt_url]);
  },

  async remove(expense: Expense): Promise<void> {
    const { error } = await getSupabase().from("expenses").delete().eq("id", expense.id);
    if (error) throw error;
    await storageService.removeByUrls(BUCKET, [expense.receipt_url]);
  },
};

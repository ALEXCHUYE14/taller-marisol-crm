/**
 * Tipos de la base de datos de Supabase (esquema `public`).
 * Reflejan 1:1 las tablas de `supabase/schema.sql`.
 * Puedes regenerarlos con:  npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * (si lo haces, conserva los alias de dominio de `src/types/index.ts`).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------- Dominios (CHECK constraints) ----------
export type InventoryCategory =
  | "Terno Completo"
  | "Saco"
  | "Pantalón"
  | "Vestido de Gala"
  | "Camisa"
  | "Accesorios";

export type InventoryStatus = "Disponible" | "Alquilado" | "En Mantenimiento" | "Reservado" | "Baja";

export type GuaranteeStatus = "Retenida" | "Devuelta" | "Retenida por Daño";

export type RentalStatus = "Reservado" | "Entregado" | "Devuelto" | "Con Retraso" | "Cancelado";

export type ServiceType = "Confección a Medida" | "Arreglo / Ajuste" | "Transformación" | "Mantenimiento";

export type TailoringStatus =
  | "Recibido"
  | "En Corte"
  | "En Costura"
  | "Prueba Pendiente"
  | "Listo para Entregar"
  | "Entregado";

export type PaymentMethod = "Efectivo" | "Yape" | "Plin" | "Transferencia" | "Tarjeta";

export type PaymentType = "Adelanto" | "Pago Total" | "Garantía" | "Liquidación Saldo";

export type ExpenseCategory =
  | "Tela"
  | "Hilos e insumos"
  | "Botones y accesorios"
  | "Alquiler del local"
  | "Servicios"
  | "Sueldos y pagos"
  | "Transporte"
  | "Mantenimiento de máquinas"
  | "Devolución de garantía"
  | "Otros";

/** Medidas estándar de sastrería (cm). Se guardan como texto para permitir "" (vacío). */
export type Measures = {
  pecho: string;
  cintura: string;
  cadera: string;
  largo_manga: string;
  talle_frente: string;
  talle_espalda: string;
  hombros: string;
  largo_pantalon: string;
  tiro: string;
  cuello: string;
};

// ---------- Filas (Row) ----------
export type BusinessSettingsRow = {
  id: string;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  ruc_dni: string | null;
  yape_qr_url: string | null;
  plin_qr_url: string | null;
  logo_url: string | null;
  receipt_message: string | null;
  updated_at: string | null;
};

export type ClientRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  dni: string | null;
  address: string | null;
  measures: Measures | null;
  notes: string | null;
  created_at: string | null;
};

export type InventoryRow = {
  id: string;
  code: string;
  name: string;
  category: InventoryCategory | null;
  size: string;
  color: string | null;
  rental_price: number;
  guarantee_price: number | null;
  status: InventoryStatus | null;
  images: string[] | null;
  created_at: string | null;
};

export type RentalRow = {
  id: string;
  client_id: string | null;
  inventory_id: string | null;
  pickup_date: string;
  return_date: string;
  total_amount: number;
  deposit_amount: number | null;
  guarantee_status: GuaranteeStatus | null;
  status: RentalStatus | null;
  notes: string | null;
  created_at: string | null;
};

export type TailoringOrderRow = {
  id: string;
  order_number: number;
  client_id: string | null;
  service_type: ServiceType | null;
  garment_description: string;
  reference_images: string[] | null;
  delivery_date: string;
  status: TailoringStatus | null;
  total_price: number;
  advance_payment: number | null;
  /** Columna generada: total_price - advance_payment */
  pending_balance: number | null;
  specific_measures: Partial<Measures> | null;
  created_at: string | null;
};

export type PaymentRow = {
  id: string;
  rental_id: string | null;
  order_id: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  reference_code: string | null;
  payment_type: PaymentType | null;
  created_at: string | null;
};

export type ExpenseRow = {
  id: string;
  /** Fecha del egreso (DATE, "YYYY-MM-DD", hora de Lima) */
  expense_date: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  payment_method: PaymentMethod;
  receipt_url: string | null;
  rental_id: string | null;
  created_at: string | null;
};

export type CashClosingRow = {
  id: string;
  closing_date: string;
  opening_cash: number;
  income_total: number;
  guarantees_in: number;
  expenses_total: number;
  guarantees_out: number;
  cash_in: number;
  cash_out: number;
  expected_cash: number;
  counted_cash: number;
  /** Columna generada: counted_cash - expected_cash */
  difference: number;
  by_method: Record<string, number>;
  notes: string | null;
  created_at: string | null;
};

/** Vista `receivables`: alquileres y confecciones con saldo pendiente */
export type ReceivableRow = {
  kind: "Alquiler" | "Confección";
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  description: string | null;
  total: number;
  paid: number;
  balance: number;
  due_date: string | null;
  status: string | null;
};

// ---------- Utilidades Insert / Update ----------
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type BusinessSettingsInsert = Partial<BusinessSettingsRow>;
export type ClientInsert = Optional<ClientRow, "id" | "email" | "dni" | "address" | "measures" | "notes" | "created_at">;
export type InventoryInsert = Optional<
  InventoryRow,
  "id" | "category" | "color" | "guarantee_price" | "status" | "images" | "created_at"
>;
export type RentalInsert = Optional<
  RentalRow,
  "id" | "client_id" | "inventory_id" | "deposit_amount" | "guarantee_status" | "status" | "notes" | "created_at"
>;
export type TailoringOrderInsert = Optional<
  Omit<TailoringOrderRow, "order_number" | "pending_balance">,
  "id" | "client_id" | "service_type" | "reference_images" | "status" | "advance_payment" | "specific_measures" | "created_at"
>;
export type PaymentInsert = Optional<
  PaymentRow,
  "id" | "rental_id" | "order_id" | "payment_method" | "reference_code" | "payment_type" | "created_at"
>;

export type ExpenseInsert = Optional<
  ExpenseRow,
  "id" | "expense_date" | "description" | "payment_method" | "receipt_url" | "rental_id" | "created_at"
>;
export type CashClosingInsert = Optional<
  Omit<CashClosingRow, "difference">,
  | "id"
  | "opening_cash"
  | "income_total"
  | "guarantees_in"
  | "expenses_total"
  | "guarantees_out"
  | "cash_in"
  | "cash_out"
  | "expected_cash"
  | "by_method"
  | "notes"
  | "created_at"
>;

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<R, I, U, Relationships extends Rel[] = []> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      business_settings: TableDef<BusinessSettingsRow, BusinessSettingsInsert, Partial<BusinessSettingsRow>>;
      clients: TableDef<ClientRow, ClientInsert, Partial<ClientRow>>;
      rentals_inventory: TableDef<InventoryRow, InventoryInsert, Partial<InventoryRow>>;
      rentals: TableDef<
        RentalRow,
        RentalInsert,
        Partial<RentalRow>,
        [
          {
            foreignKeyName: "rentals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rentals_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "rentals_inventory";
            referencedColumns: ["id"];
          },
        ]
      >;
      tailoring_orders: TableDef<
        TailoringOrderRow,
        TailoringOrderInsert,
        Partial<Omit<TailoringOrderRow, "order_number" | "pending_balance">>,
        [
          {
            foreignKeyName: "tailoring_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ]
      >;
      payments: TableDef<
        PaymentRow,
        PaymentInsert,
        Partial<PaymentRow>,
        [
          {
            foreignKeyName: "payments_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rentals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "tailoring_orders";
            referencedColumns: ["id"];
          },
        ]
      >;
      expenses: TableDef<
        ExpenseRow,
        ExpenseInsert,
        Partial<ExpenseRow>,
        [
          {
            foreignKeyName: "expenses_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rentals";
            referencedColumns: ["id"];
          },
        ]
      >;
      cash_closings: TableDef<CashClosingRow, CashClosingInsert, Partial<Omit<CashClosingRow, "difference">>>;
    };
    Views: {
      receivables: { Row: ReceivableRow; Relationships: [] };
    };
    Functions: {
      mark_overdue_rentals: { Args: Record<string, never>; Returns: number };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

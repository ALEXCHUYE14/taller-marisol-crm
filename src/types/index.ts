import type {
  BusinessSettingsRow,
  ClientRow,
  InventoryRow,
  Measures,
  PaymentRow,
  RentalRow,
  TailoringOrderRow,
} from "./database";

export * from "./database";

// ---------- Entidades de dominio (alias legibles) ----------
export type BusinessSettings = BusinessSettingsRow;
export type Client = ClientRow;
export type InventoryItem = InventoryRow;
export type Rental = RentalRow;
export type TailoringOrder = TailoringOrderRow;
export type Payment = PaymentRow;

/** Contrato de alquiler con su cliente y prenda (join) */
export interface RentalWithRelations extends RentalRow {
  client: Pick<ClientRow, "id" | "full_name" | "phone"> | null;
  item: Pick<InventoryRow, "id" | "code" | "name" | "size" | "color" | "images" | "category"> | null;
}

/** Orden de confección con su cliente (join) */
export interface TailoringOrderWithClient extends TailoringOrderRow {
  client: Pick<ClientRow, "id" | "full_name" | "phone" | "measures"> | null;
}

// ---------- Constantes de catálogo (fuente única para selects y validaciones) ----------
export const INVENTORY_CATEGORIES = [
  "Terno Completo",
  "Saco",
  "Pantalón",
  "Vestido de Gala",
  "Camisa",
  "Accesorios",
] as const;

export const INVENTORY_STATUSES = ["Disponible", "Alquilado", "En Mantenimiento", "Reservado", "Baja"] as const;

export const RENTAL_STATUSES = ["Reservado", "Entregado", "Devuelto", "Con Retraso", "Cancelado"] as const;

export const GUARANTEE_STATUSES = ["Retenida", "Devuelta", "Retenida por Daño"] as const;

export const SERVICE_TYPES = ["Confección a Medida", "Arreglo / Ajuste", "Transformación", "Mantenimiento"] as const;

export const TAILORING_STATUSES = [
  "Recibido",
  "En Corte",
  "En Costura",
  "Prueba Pendiente",
  "Listo para Entregar",
  "Entregado",
] as const;

export const PAYMENT_METHODS = ["Efectivo", "Yape", "Plin", "Transferencia", "Tarjeta"] as const;

export const PAYMENT_TYPES = ["Adelanto", "Pago Total", "Garantía", "Liquidación Saldo"] as const;

export const EMPTY_MEASURES: Measures = {
  pecho: "",
  cintura: "",
  cadera: "",
  largo_manga: "",
  talle_frente: "",
  talle_espalda: "",
  hombros: "",
  largo_pantalon: "",
  tiro: "",
  cuello: "",
};

export interface MeasureField {
  key: keyof Measures;
  label: string;
  hint: string;
  group: "Torso" | "Brazos" | "Piernas";
}

export const MEASURE_FIELDS: MeasureField[] = [
  { key: "cuello", label: "Cuello", hint: "Contorno en la base del cuello", group: "Torso" },
  { key: "hombros", label: "Hombros", hint: "De punta a punta de hombro por la espalda", group: "Torso" },
  { key: "pecho", label: "Pecho", hint: "Contorno en la parte más amplia", group: "Torso" },
  { key: "cintura", label: "Cintura", hint: "Contorno a la altura del ombligo", group: "Torso" },
  { key: "cadera", label: "Cadera", hint: "Contorno en la parte más ancha", group: "Torso" },
  { key: "talle_frente", label: "Talle Frente", hint: "Del hombro a la cintura por delante", group: "Torso" },
  { key: "talle_espalda", label: "Talle Espalda", hint: "De la base del cuello a la cintura", group: "Torso" },
  { key: "largo_manga", label: "Largo Manga", hint: "Del hombro a la muñeca", group: "Brazos" },
  { key: "largo_pantalon", label: "Largo Pantalón", hint: "De la cintura al tobillo", group: "Piernas" },
  { key: "tiro", label: "Tiro", hint: "De la cintura a la entrepierna", group: "Piernas" },
];

// ---------- Tipos de soporte ----------
export type StorageBucket = "rentals-gallery" | "tailoring-references" | "business-assets";

export interface DailyCash {
  total: number;
  byMethod: Record<string, number>;
  count: number;
}

export interface DashboardData {
  rentalsDue: RentalWithRelations[];
  rentalsOverdue: RentalWithRelations[];
  ordersDueToday: TailoringOrderWithClient[];
  ordersLate: TailoringOrderWithClient[];
  cash: DailyCash;
  incomeLast7Days: { day: string; Efectivo: number; Yape: number; Plin: number; Otros: number }[];
  ordersByStatus: { status: string; total: number }[];
  inventoryAvailable: number;
  inventoryTotal: number;
}

/** Datos normalizados para el generador de tickets / recibos */
export interface ReceiptData {
  title: string;
  number: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  items: { description: string; amount: number }[];
  total: number;
  paid: number;
  balance: number;
  paymentMethod?: string;
  extraLines?: { label: string; value: string }[];
}

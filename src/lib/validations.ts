import { z } from "zod";
import {
  GUARANTEE_STATUSES,
  INVENTORY_CATEGORIES,
  INVENTORY_STATUSES,
  PAYMENT_METHODS,
  SERVICE_TYPES,
  TAILORING_STATUSES,
} from "@/types";

const phone = z
  .string()
  .trim()
  .min(6, "Ingresa un teléfono válido")
  .max(20, "Máximo 20 caracteres")
  .regex(/^[+\d\s-]+$/, "Solo números");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .or(z.literal(""));

const money = z.coerce.number({ invalid_type_error: "Monto inválido" }).min(0, "No puede ser negativo");

const measureValue = z
  .string()
  .trim()
  .regex(/^$|^\d{1,3}([.,]\d{1,2})?$/, "Solo números (cm)");

export const measuresSchema = z.object({
  pecho: measureValue,
  cintura: measureValue,
  cadera: measureValue,
  largo_manga: measureValue,
  talle_frente: measureValue,
  talle_espalda: measureValue,
  hombros: measureValue,
  largo_pantalon: measureValue,
  tiro: measureValue,
  cuello: measureValue,
});

// ---------- Ajustes ----------
export const settingsSchema = z.object({
  business_name: z.string().trim().min(3, "Mínimo 3 caracteres").max(100),
  phone: optionalText(20),
  address: optionalText(250),
  ruc_dni: z
    .string()
    .trim()
    .regex(/^$|^(\d{8}|\d{11})$/, "DNI (8) o RUC (11 dígitos)")
    .optional()
    .or(z.literal("")),
  receipt_message: optionalText(200),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;

// ---------- Clientes ----------
export const clientSchema = z.object({
  full_name: z.string().trim().min(3, "Ingresa nombre y apellido").max(150),
  phone,
  email: z.string().trim().email("Correo inválido").max(100).optional().or(z.literal("")),
  dni: z
    .string()
    .trim()
    .regex(/^$|^\d{8,12}$/, "DNI inválido")
    .optional()
    .or(z.literal("")),
  address: optionalText(250),
  notes: optionalText(500),
  measures: measuresSchema,
});
export type ClientFormValues = z.infer<typeof clientSchema>;

export const quickClientSchema = clientSchema.pick({ full_name: true, phone: true, dni: true });
export type QuickClientFormValues = z.infer<typeof quickClientSchema>;

// ---------- Inventario ----------
export const inventorySchema = z.object({
  code: z.string().trim().min(2, "Código requerido").max(50),
  name: z.string().trim().min(3, "Nombre requerido").max(150),
  category: z.enum(INVENTORY_CATEGORIES),
  size: z.string().trim().min(1, "Talla requerida").max(20),
  color: optionalText(50),
  rental_price: money.refine((v) => v > 0, "Precio mayor a 0"),
  guarantee_price: money,
  status: z.enum(INVENTORY_STATUSES),
});
export type InventoryFormValues = z.infer<typeof inventorySchema>;

// ---------- Alquiler ----------
export const rentalSchema = z
  .object({
    client_id: z.string().uuid("Selecciona un cliente"),
    inventory_id: z.string().uuid("Selecciona una prenda"),
    pickup_date: z.string().min(10, "Fecha requerida"),
    return_date: z.string().min(10, "Fecha requerida"),
    total_amount: money.refine((v) => v > 0, "Monto mayor a 0"),
    deposit_amount: money,
    paid_now: money,
    payment_method: z.enum(PAYMENT_METHODS),
    reference_code: optionalText(100),
    deliver_now: z.boolean(),
    notes: optionalText(500),
  })
  .refine((v) => v.return_date >= v.pickup_date, {
    message: "La devolución debe ser igual o posterior al recojo",
    path: ["return_date"],
  })
  .refine((v) => v.paid_now <= v.total_amount, {
    message: "No puede superar el total del alquiler",
    path: ["paid_now"],
  });
export type RentalFormValues = z.infer<typeof rentalSchema>;

export const returnRentalSchema = z.object({
  guarantee_status: z.enum(GUARANTEE_STATUSES),
  notes: optionalText(500),
});
export type ReturnRentalFormValues = z.infer<typeof returnRentalSchema>;

// ---------- Confección ----------
export const tailoringSchema = z
  .object({
    client_id: z.string().uuid("Selecciona un cliente"),
    service_type: z.enum(SERVICE_TYPES),
    garment_description: z.string().trim().min(5, "Describe la prenda").max(1000),
    delivery_date: z.string().min(10, "Fecha requerida"),
    total_price: money.refine((v) => v > 0, "Precio mayor a 0"),
    advance_payment: money,
    payment_method: z.enum(PAYMENT_METHODS),
    status: z.enum(TAILORING_STATUSES),
    specific_measures: measuresSchema,
  })
  .refine((v) => v.advance_payment <= v.total_price, {
    message: "El adelanto no puede superar el total",
    path: ["advance_payment"],
  });
export type TailoringFormValues = z.infer<typeof tailoringSchema>;

// ---------- Pago ----------
export const paymentSchema = z.object({
  amount: money.refine((v) => v > 0, "Monto mayor a 0"),
  payment_method: z.enum(PAYMENT_METHODS),
  reference_code: optionalText(100),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;

// ---------- Login ----------
export const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

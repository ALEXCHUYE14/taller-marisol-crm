import { formatDateLong } from "./format";

/** Normaliza un celular peruano a formato internacional (51XXXXXXXXX) */
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("51") && digits.length === 11) return digits;
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string {
  const number = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openWhatsApp(phone: string | null | undefined, message: string) {
  window.open(whatsappUrl(phone, message), "_blank", "noopener,noreferrer");
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const templates = {
  rentalReminder: (client: string, returnDate: string, garment: string, business = "Taller Marisol") =>
    `Hola ${firstName(client)}, te recordamos que la entrega de tu terno (${garment}) está programada para el ${formatDateLong(
      returnDate,
    )}. ${business}.`,
  rentalPickup: (client: string, pickupDate: string, garment: string, business = "Taller Marisol") =>
    `Hola ${firstName(client)}, tu alquiler de ${garment} está confirmado. Puedes recogerlo el ${formatDateLong(
      pickupDate,
    )}. ${business}.`,
  rentalOverdue: (client: string, returnDate: string, garment: string, business = "Taller Marisol") =>
    `Hola ${firstName(client)}, la devolución de ${garment} venció el ${formatDateLong(
      returnDate,
    )}. Por favor acércate al taller a la brevedad. ${business}.`,
  orderReady: (client: string, orderNumber: number, business = "Taller Marisol") =>
    `Hola ${firstName(client)}, ¡tu prenda (orden N° ${orderNumber}) ya está lista para recoger! Te esperamos. ${business}.`,
  orderFitting: (client: string, orderNumber: number, business = "Taller Marisol") =>
    `Hola ${firstName(client)}, tu prenda (orden N° ${orderNumber}) está lista para la prueba. ¿Qué día puedes pasar? ${business}.`,
};

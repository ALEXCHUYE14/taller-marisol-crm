import { getSupabase } from "@/lib/supabase/client";
import type { StorageBucket } from "@/types";

const MAX_DIMENSION = 1600;

/**
 * Comprime la foto en el navegador antes de subirla (las fotos de celular pesan 3–8 MB).
 * Devuelve el archivo original si no es una imagen rasterizable (svg, heic sin soporte, etc.).
 */
async function compressImage(file: File, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");

export const storageService = {
  /** Sube una imagen y devuelve su URL pública */
  async uploadImage(bucket: StorageBucket, file: File, folder = "general", options?: { compress?: boolean }) {
    const supabase = getSupabase();
    const toUpload = options?.compress === false ? file : await compressImage(file);
    const path = `${slug(folder)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${slug(toUpload.name)}`;

    const { error } = await supabase.storage.from(bucket).upload(path, toUpload, {
      cacheControl: "31536000",
      upsert: false,
      contentType: toUpload.type,
    });
    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadMany(bucket: StorageBucket, files: File[], folder = "general") {
    return Promise.all(files.map((f) => storageService.uploadImage(bucket, f, folder)));
  },

  /** Obtiene la ruta interna a partir de una URL pública de Supabase */
  pathFromUrl(bucket: StorageBucket, url: string): string | null {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
  },

  async removeByUrls(bucket: StorageBucket, urls: (string | null | undefined)[]) {
    const paths = urls
      .filter((u): u is string => Boolean(u))
      .map((u) => storageService.pathFromUrl(bucket, u))
      .filter((p): p is string => Boolean(p));
    if (!paths.length) return;
    const { error } = await getSupabase().storage.from(bucket).remove(paths);
    if (error) console.warn("[storage] No se pudo eliminar:", error.message);
  },
};

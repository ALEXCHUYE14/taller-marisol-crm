"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_MB = 5;

function validate(file: File, maxMb: number): string | null {
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen (PNG, JPG o WEBP)";
  if (file.size > maxMb * 1024 * 1024) return `La imagen supera ${maxMb} MB`;
  return null;
}

/** Hook de arrastrar-y-soltar reutilizable */
function useDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);
  return {
    dragging,
    handlers: {
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Zona de carga de UNA imagen (QR de Yape / Plin, logo) con vista previa
// ---------------------------------------------------------------------------
interface ImageDropzoneProps {
  value: string | null | undefined;
  onFileSelected: (file: File) => void;
  onRemove?: () => void;
  uploading?: boolean;
  label: string;
  hint?: string;
  accentClass?: string;
  aspect?: "square" | "wide";
  maxMb?: number;
}

export function ImageDropzone({
  value,
  onFileSelected,
  onRemove,
  uploading,
  label,
  hint = "Arrastra la imagen aquí o toca para elegirla",
  accentClass = "text-olive",
  aspect = "square",
  maxMb = MAX_MB,
}: ImageDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handle = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const err = validate(file, maxMb);
    setError(err);
    if (!err) onFileSelected(file);
  };
  const { dragging, handlers } = useDrop(handle);

  return (
    <div className="space-y-2">
      <div
        {...handlers}
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-white transition-all",
          aspect === "square" ? "aspect-square" : "aspect-[16/9]",
          dragging ? "scale-[1.01] border-terracotta bg-terracotta-50" : "border-warmgray-300 hover:border-olive-300 hover:bg-olive-50/40",
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-full w-full object-contain p-3" />
            <div className="absolute inset-0 flex items-center justify-center bg-warmgray-800/0 opacity-0 transition-all group-hover:bg-warmgray-800/40 group-hover:opacity-100">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-warmgray-800 shadow">Reemplazar</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className={cn("flex size-14 items-center justify-center rounded-full bg-warmgray-100", accentClass)}>
              <UploadCloud className="size-7" />
            </span>
            <p className="font-medium text-warmgray-800">{label}</p>
            <p className="text-xs text-warmgray-500">{hint}</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="size-8 animate-spin text-terracotta" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handle(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs font-medium text-burgundy">{error}</p>}
      {value && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={uploading}
          className="flex h-10 items-center gap-1.5 text-sm font-medium text-burgundy hover:underline"
        >
          <Trash2 className="size-4" /> Quitar imagen
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Galería de VARIAS imágenes (fotos de prendas, referencias de confección)
// Mantiene imágenes existentes (URL) + archivos nuevos (File) hasta guardar.
// ---------------------------------------------------------------------------
interface MultiImageUploaderProps {
  existing: string[];
  onRemoveExisting: (url: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  max?: number;
  label?: string;
}

export function MultiImageUploader({
  existing,
  onRemoveExisting,
  files,
  onFilesChange,
  max = 8,
  label = "Agregar fotos",
}: MultiImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const previews = React.useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  React.useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  const total = existing.length + files.length;

  const add = (incoming: File[]) => {
    const valid: File[] = [];
    for (const f of incoming) {
      const err = validate(f, 10);
      if (err) {
        setError(err);
        continue;
      }
      valid.push(f);
    }
    const room = Math.max(0, max - total);
    if (valid.length > room) setError(`Máximo ${max} fotos`);
    else if (valid.length) setError(null);
    onFilesChange([...files, ...valid.slice(0, room)]);
  };
  const { dragging, handlers } = useDrop(add);

  return (
    <div className="space-y-2">
      <div
        {...handlers}
        className={cn(
          "grid grid-cols-3 gap-2 rounded-2xl border-2 border-dashed p-2 transition-colors sm:grid-cols-4",
          dragging ? "border-terracotta bg-terracotta-50" : "border-warmgray-300 bg-white",
        )}
      >
        {existing.map((url) => (
          <Thumb key={url} src={url} onRemove={() => onRemoveExisting(url)} />
        ))}
        {previews.map((src, i) => (
          <Thumb key={src} src={src} isNew onRemove={() => onFilesChange(files.filter((_, idx) => idx !== i))} />
        ))}
        {total < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-warmgray-100 text-warmgray-600 transition-colors hover:bg-olive-50 hover:text-olive"
          >
            <ImagePlus className="size-6" />
            <span className="px-1 text-center text-[11px] font-medium leading-tight">{label}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-warmgray-500">
        {total}/{max} fotos · Arrastra imágenes o usa la cámara del celular
      </p>
      {error && <p className="text-xs font-medium text-burgundy">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Thumb({ src, onRemove, isNew }: { src: string; onRemove: () => void; isNew?: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-warmgray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      {isNew && (
        <span className="absolute left-1 top-1 rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-bold text-white">
          NUEVA
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar foto"
        className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-warmgray-800/70 text-white hover:bg-burgundy"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

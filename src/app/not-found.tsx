import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-linen p-6 text-center">
      <p className="font-serif text-5xl font-semibold text-olive">404</p>
      <p className="text-warmgray-600">Esta página no existe en el taller.</p>
      <Link href="/" className="rounded-xl bg-olive px-5 py-3 font-medium text-white">
        Volver al inicio
      </Link>
    </div>
  );
}

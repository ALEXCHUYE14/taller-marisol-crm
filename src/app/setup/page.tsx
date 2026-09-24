import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Configuración inicial" };

const steps = [
  ["Crea un proyecto en supabase.com", "Plan gratuito es suficiente para el taller."],
  ["Ejecuta supabase/schema.sql", "SQL Editor → pega el archivo completo → Run. Crea tablas, RLS, triggers y los 3 buckets de Storage."],
  ["(Opcional) Ejecuta supabase/seed.sql", "Carga clientes y prendas de ejemplo."],
  ["Crea el usuario del taller", "Authentication → Users → Add user (correo + contraseña, marcar 'Auto confirm')."],
  ["Configura .env.local", "Copia .env.example a .env.local y pega Project URL y anon key (Settings → API)."],
  ["Reinicia el servidor", "Detén npm run dev y vuelve a ejecutarlo."],
];

export default function SetupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-linen px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-warmgray-200 bg-white p-6 shadow-soft sm:p-8">
        <h1 className="font-serif text-2xl font-semibold text-olive">Configuración inicial</h1>
        <p className="mt-1 text-sm text-warmgray-500">
          {isSupabaseConfigured
            ? "Supabase ya está configurado. Recarga la página."
            : "Falta conectar el CRM con Supabase. Sigue estos pasos una sola vez:"}
        </p>
        <ol className="mt-6 space-y-4">
          {steps.map(([title, desc], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-warmgray-800">{title}</p>
                <p className="text-sm text-warmgray-500">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

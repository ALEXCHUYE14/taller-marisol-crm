"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useSettings } from "@/hooks/use-settings";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

function Brand({ compact }: { compact?: boolean }) {
  const { data } = useSettings();
  const name = data?.business_name ?? "Taller de Costura Marisol";
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      {data?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logo_url} alt="" className="size-10 shrink-0 rounded-xl bg-white object-contain ring-1 ring-warmgray-200" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icon.svg" alt="" className="size-10 shrink-0 rounded-xl" />
      )}
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-serif text-[17px] font-semibold text-olive">{name}</p>
          <p className="text-xs text-warmgray-500">Alquileres · Confección</p>
        </div>
      )}
    </Link>
  );
}

async function signOut(router: ReturnType<typeof useRouter>) {
  await getSupabase().auth.signOut();
  router.replace("/login");
  router.refresh();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useRealtimeSync();

  return (
    <div className="min-h-dvh bg-linen linen-texture">
      {/* Sidebar escritorio / tablet horizontal */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-warmgray-200 bg-white/80 backdrop-blur lg:flex">
        <div className="p-5">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex h-touch items-center gap-3 rounded-xl px-4 text-[15px] font-medium transition-colors",
                  active ? "text-white" : "text-warmgray-600 hover:bg-warmgray-100",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-olive shadow-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative size-5" />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-warmgray-200 p-3">
          <button
            onClick={() => signOut(router)}
            className="flex h-touch w-full items-center gap-3 rounded-xl px-4 text-[15px] font-medium text-warmgray-600 hover:bg-burgundy-50 hover:text-burgundy"
          >
            <LogOut className="size-5" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-warmgray-200 bg-linen/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <button
          onClick={() => signOut(router)}
          aria-label="Cerrar sesión"
          className="flex size-11 items-center justify-center rounded-full text-warmgray-500 hover:bg-warmgray-200"
        >
          <LogOut className="size-5" />
        </button>
      </header>

      <main className="lg:pl-64">
        {/*
          Transición de página en CSS puro. Antes se usaba AnimatePresence mode="wait" con las rutas de Next:
          si la animación de salida no terminaba (móvil, app en segundo plano) la página nueva nunca aparecía
          y quedaba la pantalla en blanco.
        */}
        <div key={pathname} className="page-enter mx-auto max-w-7xl px-4 pb-32 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Bottom Navigation estilo App (móvil / tablet vertical) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-warmgray-200 bg-white/95 backdrop-blur pb-safe lg:hidden"
        aria-label="Navegación principal"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-6">
          {NAV_ITEMS.map(({ href, short, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute top-1.5 h-8 w-14 rounded-full bg-olive-50"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  )}
                  <Icon className={cn("relative size-[22px]", active ? "text-olive" : "text-warmgray-500")} />
                  <span className={cn("relative", active ? "text-olive" : "text-warmgray-500")}>{short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

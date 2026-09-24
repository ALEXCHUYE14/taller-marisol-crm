"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Scissors, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/alquileres?nuevo=1", label: "Nuevo Alquiler", icon: Shirt, color: "bg-olive" },
  { href: "/confecciones?nuevo=1", label: "Nueva Confección", icon: Scissors, color: "bg-terracotta" },
];

/** Acciones rápidas: botones gigantes en escritorio y FAB flotante (speed-dial) en móvil */
export function QuickActions() {
  return (
    <div className="hidden gap-3 sm:grid sm:grid-cols-2">
      {ACTIONS.map(({ href, label, icon: Icon, color }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex h-20 items-center gap-4 rounded-2xl px-6 text-lg font-semibold text-white shadow-lift transition-transform hover:-translate-y-0.5",
            color,
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
            <Plus className="size-6 transition-transform group-hover:rotate-90" />
          </span>
          <span className="flex-1">{label}</span>
          <Icon className="size-7 opacity-70" />
        </Link>
      ))}
    </div>
  );
}

export function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 sm:hidden">
      <AnimatePresence>
        {open &&
          ACTIONS.map(({ href, label, icon: Icon, color }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: (ACTIONS.length - i) * 0.04 } }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
            >
              <Link href={href} onClick={() => setOpen(false)} className={cn("flex h-14 items-center gap-3 rounded-full pl-5 pr-2 font-semibold text-white shadow-lift", color)}>
                {label}
                <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
                  <Icon className="size-5" />
                </span>
              </Link>
            </motion.div>
          ))}
      </AnimatePresence>
      {open && <div className="fixed inset-0 -z-10 bg-linen/70 backdrop-blur-[1px]" onClick={() => setOpen(false)} />}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar acciones" : "Acciones rápidas"}
        aria-expanded={open}
        className="flex size-16 items-center justify-center rounded-full bg-terracotta text-white shadow-lift"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }}>
          <Plus className="size-8" />
        </motion.span>
      </motion.button>
    </div>
  );
}

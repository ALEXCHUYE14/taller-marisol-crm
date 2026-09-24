"use client";

import { useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Image from "next/image";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations";
import { supportUrl } from "@/lib/whatsapp";
import { Button, Field, Input, WhatsAppIcon } from "@/components/ui";

/** Difumina los cuatro bordes de la portada para que se funda con el fondo de la página. */
const FADE = "#000 6%, #000 94%, transparent";
const FADE_EDGES: CSSProperties = {
  WebkitMaskImage: `linear-gradient(to right, transparent, ${FADE}), linear-gradient(to bottom, transparent, ${FADE})`,
  maskImage: `linear-gradient(to right, transparent, ${FADE}), linear-gradient(to bottom, transparent, ${FADE})`,
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
      return;
    }
    router.replace(params.get("next") || "/");
    router.refresh();
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#F2F1EC] px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex w-full flex-col items-center gap-5"
      >
        <h1 className="sr-only">Taller de Costura Marisol · Ingresar</h1>
        {/* Portada de la marca: los bordes se difuminan para fundirse con el fondo en cualquier pantalla */}
        <Image
          src="/img/portada.jpg"
          alt="Taller de Costura Marisol · Moda y arte textil"
          width={1376}
          height={768}
          priority
          sizes="(min-width: 768px) 720px, 100vw"
          className="pointer-events-none h-auto max-h-[34dvh] w-auto max-w-[min(100vw-2rem,44rem)] select-none"
          style={FADE_EDGES}
        />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-warmgray-200 bg-white p-6 shadow-soft"
        >
          <Field label="Correo" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              icon={<Mail />}
              placeholder="marisol@taller.pe"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              icon={<Lock />}
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </Field>
          <Button type="submit" block size="lg" loading={loading}>
            Ingresar al taller
          </Button>
        </form>
        <div className="w-full max-w-sm space-y-1 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm text-warmgray-600">
            <ShieldCheck className="size-4 shrink-0" aria-hidden /> Acceso exclusivo del personal autorizado
          </p>
          <a
            href={supportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <WhatsAppIcon className="size-5 shrink-0 text-[#25D366]" />
            ¿Problemas para acceder? Contactar soporte
          </a>
        </div>
      </motion.div>
    </main>
  );
}

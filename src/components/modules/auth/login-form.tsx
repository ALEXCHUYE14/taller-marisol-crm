"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations";
import { Button, Field, Input } from "@/components/ui";

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
    <div className="flex min-h-dvh items-center justify-center bg-linen linen-texture px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="mx-auto mb-4 size-16 rounded-2xl shadow-lift" />
          <h1 className="font-serif text-3xl font-semibold text-olive">Taller Marisol</h1>
          <p className="mt-1 text-sm text-warmgray-500">Costura · Alquiler de ternos · Confección a medida</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl border border-warmgray-200 bg-white p-6 shadow-soft"
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
        <p className="mt-6 text-center text-xs text-warmgray-500">
          Los usuarios se crean en Supabase → Authentication → Users.
        </p>
      </motion.div>
    </div>
  );
}

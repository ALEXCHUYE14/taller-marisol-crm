"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium text-warmgray-700", className)} {...props} />
));
Label.displayName = "Label";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Envoltura estándar: etiqueta + control + mensaje de error */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-terracotta">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-burgundy" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-warmgray-500">{hint}</p>
      ) : null}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-xl border border-warmgray-300 bg-white px-4 text-[15px] text-warmgray-800 placeholder:text-warmgray-400 transition-colors focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25 disabled:cursor-not-allowed disabled:bg-warmgray-100 aria-[invalid=true]:border-burgundy aria-[invalid=true]:ring-burgundy/20";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, icon, suffix, ...props }, ref) => {
  if (!icon && !suffix) return <input ref={ref} className={cn(inputBase, "h-touch", className)} {...props} />;
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-warmgray-400 [&_svg]:size-[18px]">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(inputBase, "h-touch", icon && "pl-11", suffix && "pr-12", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500">
          {suffix}
        </span>
      )}
    </div>
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputBase, "min-h-[96px] py-3", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        inputBase,
        "h-touch appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238A8378%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_0.9rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

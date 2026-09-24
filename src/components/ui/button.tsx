import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-linen disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-olive text-white shadow-soft hover:bg-olive-800",
        accent: "bg-terracotta text-white shadow-soft hover:bg-terracotta-500",
        outline: "border border-warmgray-300 bg-white text-warmgray-800 hover:bg-warmgray-100",
        ghost: "text-warmgray-700 hover:bg-warmgray-100",
        soft: "bg-olive-50 text-olive hover:bg-olive-100",
        danger: "bg-burgundy text-white hover:bg-burgundy-700",
        whatsapp: "bg-[#25D366] text-white shadow-soft hover:bg-[#1eb858]",
        link: "text-terracotta-600 underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-10 px-3 text-sm",
        md: "h-touch px-5 text-[15px]",
        lg: "h-14 px-6 text-base",
        icon: "h-touch w-12",
        "icon-sm": "h-10 w-10",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

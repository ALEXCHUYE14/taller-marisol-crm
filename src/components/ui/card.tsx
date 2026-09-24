import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-2xl border border-warmgray-200 bg-white shadow-soft", className)} {...props} />
  ),
);
Card.displayName = "Card";

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-olive-50 text-olive [&_svg]:size-5">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold leading-tight text-warmgray-800">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-warmgray-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2 sm:p-5 sm:pt-2", className)} {...props} />;
}

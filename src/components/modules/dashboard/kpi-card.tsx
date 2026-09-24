import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONES = {
  olive: "bg-olive-50 text-olive",
  terracotta: "bg-terracotta-50 text-terracotta-600",
  burgundy: "bg-burgundy-50 text-burgundy",
  amber: "bg-amber-50 text-amber-700",
} as const;

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "olive",
  alert,
  delay = 0,
  children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: keyof typeof TONES;
  alert?: boolean;
  delay?: number;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-soft sm:p-5",
        alert ? "border-burgundy-100" : "border-warmgray-200",
      )}
    >
      {alert && <span className="absolute right-4 top-4 size-2.5 animate-pulse rounded-full bg-burgundy" />}
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-xl [&_svg]:size-5", TONES[tone])}>{icon}</span>
        <p className="text-sm font-medium text-warmgray-600">{label}</p>
      </div>
      <p className="mt-3 font-serif text-3xl font-semibold text-warmgray-800">{value}</p>
      {sub && <div className="mt-1 text-sm text-warmgray-500">{sub}</div>}
      {children}
    </motion.div>
  );
}

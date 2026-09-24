import { LayoutDashboard, Scissors, Settings, Shirt, Users, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Inicio", icon: LayoutDashboard },
  { href: "/alquileres", label: "Alquileres", short: "Alquiler", icon: Shirt },
  { href: "/confecciones", label: "Confecciones", short: "Taller", icon: Scissors },
  { href: "/clientes", label: "Clientes", short: "Clientes", icon: Users },
  { href: "/caja", label: "Caja", short: "Caja", icon: Wallet },
  { href: "/ajustes", label: "Ajustes", short: "Ajustes", icon: Settings },
];

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

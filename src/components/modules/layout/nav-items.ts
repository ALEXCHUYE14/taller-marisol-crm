import { LayoutDashboard, Scissors, Settings, Shirt, Users, type LucideIcon } from "lucide-react";

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
  { href: "/ajustes", label: "Ajustes", short: "Ajustes", icon: Settings },
];

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Taller de Costura Marisol", template: "%s · Taller Marisol" },
  description: "CRM de alquiler de ternos, confección a medida y caja del Taller de Costura Marisol",
  applicationName: "Taller Marisol",
  appleWebApp: { capable: true, title: "Taller Marisol", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#3E4E3A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

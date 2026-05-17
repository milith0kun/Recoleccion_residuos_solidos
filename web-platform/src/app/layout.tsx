import type { Metadata } from "next";
import { Newsreader, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "SRSS Cusco — Recolección de Residuos Sólidos Segregados";
const description =
  "Plataforma de gestión ambiental urbana del Cusco: rutas de recolección, zonas, vehículos, incidentes y seguimiento GPS en tiempo real.";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · SRSS Cusco",
  },
  description,
  applicationName: "SRSS Cusco",
  keywords: [
    "Cusco",
    "residuos sólidos",
    "recolección",
    "segregación",
    "gestión ambiental",
    "rutas",
    "GPS",
  ],
  authors: [{ name: "Municipalidad Provincial del Cusco" }],
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: siteUrl,
    siteName: "SRSS Cusco",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${newsreader.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

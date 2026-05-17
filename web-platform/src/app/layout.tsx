import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://srss.ecosdelseo.com";
const SITE_NAME = "SRSS Cusco";
const DEFAULT_TITLE =
  "SRSS Cusco — Sistema de Recolección de Residuos Sólidos Segregados";
const DEFAULT_DESCRIPTION =
  "Plataforma de gestión ambiental urbana del Cusco: rutas, zonas, vehículos, seguimiento GPS y catálogo de residuos según NTP 900.058.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Municipalidad Provincial del Cusco" }],
  creator: SITE_NAME,
  publisher: "Municipalidad Provincial del Cusco",
  keywords: [
    "SRSS",
    "Cusco",
    "residuos sólidos",
    "recolección",
    "gestión ambiental",
    "NTP 900.058",
    "municipalidad",
    "GPS",
    "rutas",
    "zonas",
  ],
  category: "government",
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [{ url: "/icon.svg?v=3", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon?v=3", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.svg?v=3"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "/",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image?v=2",
        width: 1200,
        height: 630,
        alt: "SRSS Cusco — Sistema de Recolección de Residuos Sólidos Segregados",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image?v=2"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#00684A",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

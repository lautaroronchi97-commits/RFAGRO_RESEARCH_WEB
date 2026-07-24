import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ROFO AGRO · Pizarra electrónica de granos",
  description:
    "Research de mercado de granos de Argentina: arbitrajes pizarra vs A3, dólar futuro, tasas implícitas. ROFO AGRO — Consultora de granos.",
  // El noindex global se sacó en E3 (fase 2) al conectar la pizarra real de CAC y quitar las
  // implícitas de granos de ejemplo (ya no queda dato falso a la vista). Las páginas de mesa
  // (admin, comercio/*, produccion, granos/view) mantienen su `robots: index:false` propio.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${jbMono.variable}`}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

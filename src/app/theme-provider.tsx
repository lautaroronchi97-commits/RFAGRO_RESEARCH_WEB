"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Provee el tema claro/oscuro. `attribute="data-theme"` hace que next-themes
 * ponga data-theme="light|dark" en <html>, que es lo que leen nuestros tokens CSS.
 * Default claro (marca / clientes); el trader togglea a "rueda" (oscuro).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

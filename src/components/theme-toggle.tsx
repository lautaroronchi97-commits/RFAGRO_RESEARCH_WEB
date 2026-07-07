"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const emptySubscribe = () => () => {};

/** Botón claro (marca) ⇄ oscuro ("rueda"). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // true recién en el cliente (evita mismatch de hidratación sin setState-en-effect)
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      className="toggle"
      type="button"
      aria-pressed={isDark}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo rueda (oscuro)"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="ic" aria-hidden="true" />
      <span className="lbl">{isDark ? "Modo pizarra" : "Modo rueda"}</span>
    </button>
  );
}

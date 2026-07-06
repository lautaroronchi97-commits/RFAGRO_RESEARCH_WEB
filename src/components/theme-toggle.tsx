"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/** Botón claro (marca) ⇄ oscuro ("rueda"). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

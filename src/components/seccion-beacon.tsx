"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { seccionDeRuta } from "@/lib/auth/config";

/**
 * Registro de visita por sección (Etapa 2). Client component que, al cambiar de
 * ruta, avisa a `/api/log-seccion` qué sección se visitó. El servidor inserta el
 * evento en `access_log` con throttle de 10 min (RPC `registrar_visita_seccion`).
 *
 * Diseño liviano y sin romper el ISR:
 *  - Se monta solo con el login activo (lo decide el layout del sitio).
 *  - Throttle también en el cliente vía sessionStorage (1 aviso por sección cada
 *    10 min por pestaña) → no spamea el endpoint aunque el usuario entre y salga.
 *  - Usa `sendBeacon` (o fetch keepalive) para no bloquear la navegación.
 */
const VENTANA_MS = 10 * 60 * 1000;

export function SeccionBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const seccion = seccionDeRuta(pathname);
    if (!seccion) return;

    // Throttle por pestaña para no pegarle al endpoint en cada navegación.
    const key = `rfagro:vis:${seccion}`;
    try {
      const last = Number(sessionStorage.getItem(key) ?? "0");
      if (Date.now() - last < VENTANA_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // sessionStorage no disponible: seguimos igual (el server también throttlea).
    }

    const body = JSON.stringify({ seccion });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/log-seccion", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/log-seccion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // Registrar la visita nunca debe romper la navegación.
    }
  }, [pathname]);

  return null;
}

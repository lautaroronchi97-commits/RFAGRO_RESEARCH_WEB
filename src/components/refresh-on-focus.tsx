"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { algunaRuedaAbierta } from "@/lib/rueda";

/**
 * Mantiene los datos del server frescos en una pestaña que queda abierta.
 *   1) Al volver a la pestaña (visibilitychange), refresca (throttle 60s).
 *   2) Mientras haya rueda abierta y la pestaña esté visible, refresca cada 30s
 *      (poll en vivo): una pestaña abierta todo el día NO dispara visibilitychange,
 *      así que sin esto la tabla de arbitrajes/pases quedaba congelada durante la
 *      rueda. Fuera de horario de rueda no hace polling (no regenera de gusto).
 * `router.refresh()` re-pide el RSC del server (que sirve la regeneración ISR).
 */
const FOCUS_THROTTLE_MS = 60_000;
const POLL_MS = 30_000;

export function RefreshOnFocus() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    const refrescar = () => {
      last.current = Date.now();
      router.refresh();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > FOCUS_THROTTLE_MS) {
        refrescar();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const tick = () => {
      if (document.visibilityState === "visible" && algunaRuedaAbierta()) {
        refrescar();
      }
    };
    const id = setInterval(tick, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [router]);

  return null;
}

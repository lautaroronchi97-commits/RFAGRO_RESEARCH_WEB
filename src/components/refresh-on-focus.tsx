"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * El caso de uso real es una pestaña abierta todo el día: al volver a la
 * pestaña, refresca los datos del server (throttle 60s para no martillar).
 */
export function RefreshOnFocus() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > 60_000) {
        last.current = Date.now();
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return null;
}

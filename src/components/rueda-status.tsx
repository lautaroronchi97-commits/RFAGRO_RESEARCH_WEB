"use client";

import { useEffect, useState } from "react";
import { RUEDAS, ahoraCordoba, ruedaAbierta } from "@/lib/rueda";

/**
 * Estado en vivo de las ruedas de Matba Rofex (hora Córdoba), horarios oficiales:
 *   - Dólar / Monedas: 10:00 a 15:00 (ajuste 15:00).
 *   - Agro / granos:   10:30 a 17:00 (ajuste 17:00).
 * Marca abierta (verde) sólo en días hábiles (L-V) dentro del horario.
 * Los horarios y el cálculo viven en `@/lib/rueda` (compartidos con la capa en vivo de A3).
 */

export function RuedaStatus() {
  const [now, setNow] = useState<{ min: number; dow: number } | null>(null);

  useEffect(() => {
    const upd = () => setNow(ahoraCordoba());
    upd();
    const id = setInterval(upd, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="ruedas" aria-label="Horarios de rueda">
      {RUEDAS.map((r) => {
        const abierta = now ? ruedaAbierta(r, now) : false;
        return (
          <span
            key={r.nombre}
            className="rueda-tag"
            title={`Rueda ${r.nombre}: ${r.label} hs${abierta ? " · abierta" : " · cerrada"}`}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                display: "inline-block",
                background: abierta ? "var(--pos, #16A34A)" : "var(--ink-3, #94a3b8)",
                opacity: abierta ? 1 : 0.6,
              }}
            />
            {r.nombre}&nbsp;{r.label}
          </span>
        );
      })}
    </span>
  );
}

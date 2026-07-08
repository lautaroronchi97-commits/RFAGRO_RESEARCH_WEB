"use client";

import { useEffect, useState } from "react";

/**
 * Estado en vivo de las ruedas de Matba Rofex (hora Córdoba), horarios oficiales:
 *   - Dólar / Monedas: 10:00 a 15:00 (ajuste 15:00).
 *   - Agro / granos:   10:30 a 17:00 (ajuste 17:00).
 * Marca abierta (verde) sólo en días hábiles (L-V) dentro del horario.
 */

type Rueda = { nombre: string; label: string; abre: number; cierra: number };

const RUEDAS: Rueda[] = [
  { nombre: "Dólar", label: "10–15", abre: 10 * 60, cierra: 15 * 60 },
  { nombre: "Agro", label: "10:30–17", abre: 10 * 60 + 30, cierra: 17 * 60 },
];

/** Minutos desde medianoche y día de semana (0=Dom … 6=Sáb) en Córdoba. */
function ahoraCordoba(): { min: number; dow: number } {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Cordoba",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { min: (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m), dow: dias[get("weekday")] ?? 0 };
}

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
        const habil = now ? now.dow >= 1 && now.dow <= 5 : false;
        const abierta = now ? habil && now.min >= r.abre && now.min < r.cierra : false;
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

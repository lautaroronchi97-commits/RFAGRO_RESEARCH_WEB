"use client";

import { useMemo, useState } from "react";
import {
  fechaLarga,
  ORG_LABEL,
  type EventoCalendario,
  type Organismo,
} from "@/lib/calendario";

/** Agrupa por fecha ISO conservando orden. */
function porFecha(evs: EventoCalendario[]): Array<[string, EventoCalendario[]]> {
  const map = new Map<string, EventoCalendario[]>();
  for (const e of evs) {
    const arr = map.get(e.fechaISO) ?? [];
    arr.push(e);
    map.set(e.fechaISO, arr);
  }
  return [...map.entries()];
}

/**
 * Calendario cronológico completo con filtros (organismo + solo alto interés).
 * Recibe los eventos ya calculados en el server; el filtro es client-side.
 */
export function CalendarioCliente({
  eventos,
  organismos,
}: {
  eventos: EventoCalendario[];
  organismos: Organismo[];
}) {
  const [off, setOff] = useState<Set<Organismo>>(new Set());
  const [soloAlto, setSoloAlto] = useState(false);

  const filtrados = useMemo(
    () =>
      eventos.filter(
        (e) => !off.has(e.organismo) && (!soloAlto || e.importancia === "alta"),
      ),
    [eventos, off, soloAlto],
  );
  const grupos = useMemo(() => porFecha(filtrados), [filtrados]);

  function toggle(o: Organismo) {
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  }

  return (
    <div>
      <div className="cal-filters" role="group" aria-label="Filtros del calendario">
        {organismos.map((o) => (
          <button
            key={o}
            type="button"
            className={`cal-fchip org-${o} ${off.has(o) ? "is-off" : ""}`}
            aria-pressed={!off.has(o)}
            onClick={() => toggle(o)}
          >
            {ORG_LABEL[o]}
          </button>
        ))}
        <button
          type="button"
          className={`cal-fchip cal-fchip-alto ${soloAlto ? "is-on" : ""}`}
          aria-pressed={soloAlto}
          onClick={() => setSoloAlto((v) => !v)}
        >
          ● Solo alto interés
        </button>
      </div>

      <div className="cal-full">
        {grupos.length === 0 && <div className="cal-empty">Nada para mostrar con estos filtros.</div>}
        {grupos.map(([fecha, evs]) => (
          <div className="cal-fday" key={fecha}>
            <div className="cal-fdate">{fechaLarga(fecha)}</div>
            <div className="cal-fevs">
              {evs.map((e, i) => (
                <a
                  className="cal-ev"
                  key={`${e.organismo}-${e.informe}-${i}`}
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={`cal-org org-${e.organismo}`}>{ORG_LABEL[e.organismo]}</span>
                  <span className="cal-ev-body">
                    <span className="cal-ev-title">
                      {e.informe}
                      {e.importancia === "alta" && (
                        <span className="cal-hot" title="Mueve el mercado">
                          ●
                        </span>
                      )}
                    </span>
                    <span className="cal-ev-sub">
                      {e.region} · {e.granos}
                    </span>
                    {e.nota && <span className="cal-ev-note">{e.nota}</span>}
                  </span>
                  <span className="cal-when">
                    {e.horaArg ? (
                      <span className="cal-hora">{e.horaArg}</span>
                    ) : (
                      <span className="cal-hora dim">—</span>
                    )}
                    {e.tipo === "regla" ? (
                      <span className="cal-est" title="Fecha estimada por regla (el organismo no publica calendario)">
                        est.
                      </span>
                    ) : (
                      <span className="cal-of" title="Fecha oficial publicada por el organismo">
                        oficial
                      </span>
                    )}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

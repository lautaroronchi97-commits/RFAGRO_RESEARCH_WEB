"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { nfmt } from "@/lib/format";
import { procesarPas, type PasState } from "./pas-actions";

/**
 * Uploader del export histórico de BCBA-PAS (A3 del backlog maestro): la fuente automática está
 * bloqueada por Cloudflare (ver `scripts/ingest-pas.mjs`) — Lautaro está suscripto por WhatsApp y
 * baja el CSV desde bolsadecereales.com/estimaciones-agricolas en su navegador. Mismo patrón 2
 * pasos que el uploader de DEA-SAGyP.
 */
export function PasUploader({ hoy }: { hoy: string }) {
  const [st, dispatch, pend] = useActionState<PasState, FormData>(procesarPas, undefined);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = (paso: "preview" | "confirm") => {
    if (!archivo || pend) return;
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("fecha", fecha);
    fd.append("paso", paso);
    startTransition(() => dispatch(fd));
  };

  const previewVigente = st?.preview && archivo && st.preview.archivo === archivo.name && st.preview.fecha === fecha;
  const p = st?.preview;

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Estimaciones BCBA-PAS (carga manual)</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        La fuente automática está bloqueada (Cloudflare). Descargá el CSV histórico desde{" "}
        <a href="https://www.bolsadecereales.com/estimaciones-agricolas" target="_blank" rel="noopener noreferrer">
          bolsadecereales.com/estimaciones-agricolas
        </a>{" "}
        y subilo acá — se agrega el vintage de hoy al comparador de <code>/produccion</code>. Filas idénticas a
        la campaña anterior (dato sin actualizar en el origen) o con producción fuera de rango se descartan
        solas y quedan listadas abajo — nunca se cargan en silencio.
      </p>
      <label className="admin-field">
        <span>Fecha del snapshot</span>
        <input
          className="admin-input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          max={hoy}
        />
      </label>
      <label className="admin-field" style={{ marginTop: 8 }}>
        <span>CSV histórico del PAS</span>
        <input
          ref={inputRef}
          className="admin-input"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="admin-card-acciones">
        <button type="button" className="admin-btn" disabled={!archivo || pend} onClick={() => enviar("preview")}>
          {pend ? "Procesando…" : "1 · Previsualizar"}
        </button>
        <button type="button" className="admin-btn admin-btn-ok" disabled={!previewVigente || pend} onClick={() => enviar("confirm")}>
          {pend ? "Procesando…" : "2 · Confirmar y cargar"}
        </button>
      </div>

      {st?.error && <p className="admin-msg admin-msg-err" role="alert">{st.error}</p>}

      {p && (
        <div className="admin-preview">
          <h3 className="admin-preview-h">Previsualización — {p.archivo} (no se cargó nada todavía)</h3>
          <div className="admin-card-facts">
            <span><b>{nfmt(p.filas, 0)}</b> filas (grano × campaña × variable)</span>
            <span>vintage <b>{p.fecha}</b></span>
          </div>
          <div className="admin-chips" style={{ marginTop: 8 }}>
            {p.granos.map((g) => <span key={g} className="admin-chip">{g}</span>)}
            {p.campanias.map((c) => <span key={c} className="admin-chip">{c}</span>)}
          </div>
          {p.descartes.length > 0 && (
            <ul className="admin-preview-warns" style={{ marginTop: 10 }}>
              {p.descartes.map((d, i) => (
                <li key={i}>⚠ {d.grano} {d.campania}: {d.motivo}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {st?.ok && (
        <p className="admin-msg admin-msg-ok">
          Listo: {nfmt(st.ok.filas, 0)} filas cargadas/actualizadas
          {st.ok.descartadas > 0 ? ` (${st.ok.descartadas} campañas descartadas, ver arriba)` : ""}. El
          comparador de /produccion se refresca solo.
        </p>
      )}
    </div>
  );
}

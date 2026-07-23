"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { nfmt } from "@/lib/format";
import { procesarDea, type DeaState } from "./dea-actions";

/**
 * Uploader del CSV oficial de la DEA-SAGyP (lote L5): la fuente automática está bloqueada por IP
 * (`datosestimaciones.magyp.gob.ar`, ver `scripts/ingest-dea.mjs`) — Lautaro lo baja de su
 * navegador (no bloqueado) y lo sube acá. Dos pasos con el mismo archivo, mismo patrón que el
 * uploader de compras/Agrochat.
 */
export function DeaUploader({ hoy }: { hoy: string }) {
  const [st, dispatch, pend] = useActionState<DeaState, FormData>(procesarDea, undefined);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [full, setFull] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = (paso: "preview" | "confirm") => {
    if (!archivo || pend) return;
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("fecha", fecha);
    fd.append("paso", paso);
    if (full) fd.append("full", "1");
    startTransition(() => dispatch(fd));
  };

  const previewVigente = st?.preview && archivo && st.preview.archivo === archivo.name && st.preview.fecha === fecha;
  const p = st?.preview;

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Estimaciones DEA-SAGyP (carga manual)</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        La fuente automática está bloqueada por IP (lote L5). Descargá el CSV desde{" "}
        <a href="https://datosestimaciones.magyp.gob.ar/" target="_blank" rel="noopener noreferrer">
          datosestimaciones.magyp.gob.ar
        </a>{" "}
        (botón de descarga del reporte &ldquo;Estimaciones&rdquo;) y subilo acá — se agrega el vintage de hoy al
        comparador de <code>/produccion</code>.
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
        <span>CSV oficial de la DEA</span>
        <input
          ref={inputRef}
          className="admin-input"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="admin-sub" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} />
        Cargar todo el histórico (1969/70→hoy) — normalmente no hace falta, solo para un backfill puntual
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
        </div>
      )}

      {st?.ok && (
        <p className="admin-msg admin-msg-ok">
          Listo: {nfmt(st.ok.filas, 0)} filas cargadas/actualizadas. El comparador de /produccion se refresca solo.
        </p>
      )}
    </div>
  );
}

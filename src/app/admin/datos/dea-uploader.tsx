"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { nfmt } from "@/lib/format";
import { parseDea, resumenFilas, type FilaEstimacion } from "@/lib/parse-dea";
import { confirmarDea, type DeaState } from "./dea-actions";

type Preview = { archivo: string; filas: number; granos: string[]; campanias: string[]; fecha: string };

/**
 * Uploader del CSV oficial de la DEA-SAGyP (lote L5): la fuente automática está bloqueada por IP
 * (`datosestimaciones.magyp.gob.ar`, ver `scripts/ingest-dea.mjs`) — Lautaro lo baja de su
 * navegador (no bloqueado) y lo sube acá. El CSV pesa ~11,5 MB (provincia × departamento ×
 * cultivo × campaña, serie completa 1969/70→hoy) — mandarlo a una Server Action choca con el
 * límite de payload de las funciones de Vercel (~4,5 MB, no configurable), confirmado con un
 * intento real. Por eso el parseo/agregado a nacional (`parseDea`, módulo puro sin `server-only`)
 * corre ACÁ, en el navegador — "1 · Previsualizar" no pega al servidor, solo lee el archivo local;
 * recién "2 · Confirmar" manda el resumen ya agregado (unas pocas decenas de filas).
 */
export function DeaUploader({ hoy }: { hoy: string }) {
  const [st, dispatch, pend] = useActionState<DeaState, FormData>(confirmarDea, undefined);
  const [fecha, setFecha] = useState(hoy);
  const [full, setFull] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [parseando, setParseando] = useState(false);
  const [parseError, setParseError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filas, setFilas] = useState<FilaEstimacion[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const limpiarResultado = () => {
    setPreview(null);
    setFilas(null);
    setParseError("");
  };

  const previsualizar = async () => {
    if (!archivo || parseando) return;
    setParseando(true);
    limpiarResultado();
    try {
      const buf = await archivo.arrayBuffer();
      const csv = new TextDecoder("latin1").decode(buf);
      const sinceYear = full ? null : new Date(fecha).getUTCFullYear() - 2;
      const rows = parseDea(csv, fecha, sinceYear);
      if (rows.length === 0) {
        setParseError(
          "El CSV no trajo ninguna fila reconocible — ¿es el export oficial de la DEA (Datos de Estimaciones Agrícolas)?",
        );
        return;
      }
      const { granos, campanias } = resumenFilas(rows);
      setFilas(rows);
      setPreview({ archivo: archivo.name, filas: rows.length, granos, campanias, fecha });
    } catch (e) {
      setParseError(`No pude leer el CSV: ${e instanceof Error ? e.message : "formato inválido"}.`);
    } finally {
      setParseando(false);
    }
  };

  const confirmar = () => {
    if (!filas || pend) return;
    const fd = new FormData();
    fd.append("filas", JSON.stringify(filas));
    startTransition(() => dispatch(fd));
  };

  const previewVigente = preview && archivo && preview.archivo === archivo.name && preview.fecha === fecha;

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Estimaciones DEA-SAGyP (carga manual)</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        La fuente automática está bloqueada por IP (lote L5). Descargá el CSV desde{" "}
        <a href="https://datosestimaciones.magyp.gob.ar/" target="_blank" rel="noopener noreferrer">
          datosestimaciones.magyp.gob.ar
        </a>{" "}
        (botón de descarga del reporte &ldquo;Estimaciones&rdquo;, el dataset completo sin filtrar) y
        subilo acá — se agrega el vintage de hoy al comparador de <code>/produccion</code>. Pesa ~11 MB:
        se procesa acá en tu navegador, nunca se manda el archivo entero al servidor.
      </p>
      <label className="admin-field">
        <span>Fecha del snapshot</span>
        <input
          className="admin-input"
          type="date"
          value={fecha}
          onChange={(e) => { setFecha(e.target.value); limpiarResultado(); }}
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
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            limpiarResultado();
          }}
        />
      </label>
      <label className="admin-sub" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={full}
          onChange={(e) => { setFull(e.target.checked); limpiarResultado(); }}
        />
        Cargar todo el histórico (1969/70→hoy) — normalmente no hace falta, solo para un backfill puntual
      </label>

      <div className="admin-card-acciones">
        <button type="button" className="admin-btn" disabled={!archivo || parseando} onClick={previsualizar}>
          {parseando ? "Procesando en tu navegador…" : "1 · Previsualizar"}
        </button>
        <button type="button" className="admin-btn admin-btn-ok" disabled={!previewVigente || pend} onClick={confirmar}>
          {pend ? "Cargando…" : "2 · Confirmar y cargar"}
        </button>
      </div>

      {parseError && <p className="admin-msg admin-msg-err" role="alert">{parseError}</p>}
      {st?.error && <p className="admin-msg admin-msg-err" role="alert">{st.error}</p>}

      {preview && (
        <div className="admin-preview">
          <h3 className="admin-preview-h">Previsualización — {preview.archivo} (no se cargó nada todavía)</h3>
          <div className="admin-card-facts">
            <span><b>{nfmt(preview.filas, 0)}</b> filas (grano × campaña × variable)</span>
            <span>vintage <b>{preview.fecha}</b></span>
          </div>
          <div className="admin-chips" style={{ marginTop: 8 }}>
            {preview.granos.map((g) => <span key={g} className="admin-chip">{g}</span>)}
            {preview.campanias.map((c) => <span key={c} className="admin-chip">{c}</span>)}
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

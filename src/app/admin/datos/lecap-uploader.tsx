"use client";

import { useActionState, useState, startTransition } from "react";
import { nfmt } from "@/lib/format";
import { procesarLecap, type LecapState } from "./lecap-actions";

/**
 * Carga manual del "pago final por letra" (C13/P9). El precio diario de cada LECAP ya lo trae la
 * web (data912); acá solo se carga el IMPORTE AL VENCIMIENTO, que se fija en la emisión y casi no
 * cambia. Se pega una letra por línea (`TICKER  PAGO_FINAL  [FECHA]`), se previsualiza y se confirma.
 */
export function LecapUploader({ actuales }: { actuales: { ticker: string; pago_final: number; fecha_vencimiento: string | null }[] }) {
  const [st, dispatch, pend] = useActionState<LecapState, FormData>(procesarLecap, undefined);
  const [texto, setTexto] = useState("");

  const enviar = (paso: "preview" | "confirm") => {
    if (!texto.trim() || pend) return;
    const fd = new FormData();
    fd.append("texto", texto);
    fd.append("paso", paso);
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Pago final de letras (sintéticos)</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        Alimenta el panel <a href="/dolar">Sintéticos de /dolar</a> (LECAP + dólar futuro). El precio diario
        de cada letra lo trae la web sola; acá va solo el <b>pago final</b> (importe al vencimiento, VN 100),
        que se fija en la emisión y casi no cambia — cargalo cuando el Tesoro emita letras nuevas. Sacalo de
        tu Excel (columna &ldquo;Pago Final&rdquo;), del informe de{" "}
        <a href="https://www.iamc.com.ar/informeslecap/" target="_blank" rel="noopener noreferrer">IAMC</a>{" "}
        o del boletín de BYMA.
      </p>
      <label className="admin-field">
        <span>Una letra por línea: <code>TICKER  PAGO_FINAL  [VENCIMIENTO]</code></span>
        <textarea
          className="admin-input"
          rows={6}
          style={{ fontFamily: "var(--font-mono, monospace)", resize: "vertical" }}
          placeholder={"S31L6  117.677  2026-07-31\nS14G6  108.03   2026-08-14\nS31G6  127.064  2026-08-31"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>

      <div className="admin-card-acciones">
        <button type="button" className="admin-btn" disabled={!texto.trim() || pend} onClick={() => enviar("preview")}>
          {pend ? "Procesando…" : "1 · Previsualizar"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ok"
          disabled={!st?.preview || pend}
          onClick={() => enviar("confirm")}
        >
          {pend ? "Procesando…" : "2 · Confirmar y cargar"}
        </button>
      </div>

      {st?.error && <p className="admin-msg admin-msg-err" role="alert">{st.error}</p>}

      {st?.preview && (
        <div className="admin-preview">
          <h3 className="admin-preview-h">
            Previsualización — {nfmt(st.preview.filas.length, 0)} letra(s) (no se cargó nada todavía)
          </h3>
          {st.nota && <p className="admin-sub" style={{ margin: "4px 0 8px", color: "var(--warn, #b45309)" }}>{st.nota}</p>}
          <div className="admin-chips" style={{ marginTop: 8 }}>
            {st.preview.filas.map((f) => (
              <span key={f.ticker} className="admin-chip">
                {f.ticker}: {nfmt(f.pago_final, 3)}{f.fecha_vencimiento ? ` · ${f.fecha_vencimiento}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {st?.ok && (
        <p className="admin-msg admin-msg-ok">
          Listo: {nfmt(st.ok.filas, 0)} letra(s) cargada(s)/actualizada(s). El panel de /dolar se refresca solo.
        </p>
      )}

      {actuales.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="admin-sub" style={{ cursor: "pointer" }}>
            Pago final ya cargado ({actuales.length})
          </summary>
          <div className="admin-chips" style={{ marginTop: 8 }}>
            {actuales.map((a) => (
              <span key={a.ticker} className="admin-chip">
                {a.ticker}: {nfmt(a.pago_final, 3)}{a.fecha_vencimiento ? ` · ${a.fecha_vencimiento}` : ""}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

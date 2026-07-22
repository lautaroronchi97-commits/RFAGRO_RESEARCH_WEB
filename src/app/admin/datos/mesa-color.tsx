"use client";

import { useActionState } from "react";
import { guardarColorRueda } from "./mesa-color-actions";

function ddmmaaaa(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * "Color de la rueda" del informe diario (MP1 de PLAN_INFORMES.md): textarea grande
 * pensada para cargar desde el celular, con la fecha de hoy precargada y lo último
 * guardado como referencia. Si un día no se carga nada, el informe sale igual, solo
 * con los datos automáticos (degrada, nunca traba la Routine).
 */
export function MesaColor({
  fechaHoy,
  actualHoy,
  recientes,
}: {
  fechaHoy: string;
  actualHoy: string;
  recientes: { fecha: string; texto: string }[];
}) {
  const [st, dispatch, pend] = useActionState(guardarColorRueda, undefined);

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Color de la rueda — {ddmmaaaa(fechaHoy)}</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        Lo que viste hoy en la rueda (negocios, sensaciones, algo puntual). Alimenta el informe
        diario junto con los datos automáticos. Si no cargás nada, el informe sale igual.
      </p>
      <form action={dispatch}>
        <input type="hidden" name="fecha" value={fechaHoy} />
        <textarea
          name="texto"
          className="admin-input"
          rows={5}
          defaultValue={actualHoy}
          placeholder="Ej: rueda floja de agro, poco negocio en soja disponible, exportación firme en trigo julio…"
        />
        <div className="admin-card-acciones">
          <button type="submit" className="admin-btn admin-btn-ok" disabled={pend}>
            {pend ? "Guardando…" : "Guardar color de hoy"}
          </button>
        </div>
      </form>
      {st?.error && <p className="admin-msg admin-msg-err" role="alert">{st.error}</p>}
      {st?.ok && <p className="admin-msg admin-msg-ok">{st.ok}</p>}

      {recientes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p className="admin-sub" style={{ margin: "0 0 6px" }}>Últimos días cargados</p>
          <ul className="admin-preview-warns">
            {recientes.map((r) => (
              <li key={r.fecha}>
                <b>{ddmmaaaa(r.fecha)}</b>: {r.texto}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

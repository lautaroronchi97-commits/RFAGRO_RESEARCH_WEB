"use client";

import { useActionState } from "react";
import { guardarDatosDelDia } from "./datos-dia-actions";

function ddmmaaaa(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * "Datos del día" del informe diario (MP1 de PLAN_INFORMES.md): el color de la
 * rueda (texto libre) + las compras netas del BCRA del día (M USD, carga manual —
 * P3 de PLAN_BACKLOG.md sumará la ingesta automática a la misma tabla). Pensado
 * para cargar desde el celular, con la fecha de hoy precargada y lo último
 * guardado como referencia. Si un día no se carga nada, el informe sale igual,
 * solo con los datos automáticos (degrada, nunca traba la Routine).
 */
export function DatosDia({
  fechaHoy,
  colorHoy,
  bcraHoy,
  recientes,
}: {
  fechaHoy: string;
  colorHoy: string;
  bcraHoy: number | null;
  recientes: { fecha: string; texto: string }[];
}) {
  const [st, dispatch, pend] = useActionState(guardarDatosDelDia, undefined);

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Datos del día — {ddmmaaaa(fechaHoy)}</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        Lo que viste hoy en la rueda (negocios, sensaciones, precios que te pasaron) y las compras
        netas del BCRA del día. Alimenta el informe diario junto con los datos automáticos. Si no
        cargás nada, el informe sale igual.
      </p>
      <form action={dispatch}>
        <input type="hidden" name="fecha" value={fechaHoy} />
        <label className="admin-field">
          <span>Color de la rueda</span>
          <textarea
            name="texto"
            className="admin-input"
            rows={6}
            defaultValue={colorHoy}
            placeholder="Ej: rueda floja de agro, poco negocio en soja disponible, exportación apretando en trigo julio, volumen X mil t…"
          />
        </label>
        <label className="admin-field" style={{ marginTop: 10 }}>
          <span>Compras BCRA de hoy (M USD)</span>
          <input
            name="bcra"
            className="admin-input"
            type="text"
            inputMode="decimal"
            defaultValue={bcraHoy != null ? String(bcraHoy).replace(".", ",") : ""}
            placeholder="Ej: 120,5"
          />
        </label>
        <div className="admin-card-acciones">
          <button type="submit" className="admin-btn admin-btn-ok" disabled={pend}>
            {pend ? "Guardando…" : "Guardar datos de hoy"}
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

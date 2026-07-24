"use client";

import { useActionState } from "react";
import { guardarComprasBcraManual } from "./bcra-actions";

function ddmmaaaa(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export type PuntoReciente = { fecha: string; montoMusd: number; fuente: "manual" | "api" };

/**
 * Carga manual de "Compras netas BCRA (MULC)" para CUALQUIER fecha reciente (no solo hoy) —
 * pedido explícito de Lautaro (24/07): la API oficial llega con rezago (~3-4 días hábiles), así
 * que él quiere poder cargar a mano el día de ayer (u otro hueco) mientras llega el dato oficial.
 * La fecha arranca precargada en el hueco hábil más reciente sin dato (o ayer si no hay huecos).
 * Se pisa sola cuando la ingesta automática trae el valor real de esa fecha.
 */
export function BcraManual({ fechaDefault, recientes, faltantes }: { fechaDefault: string; recientes: PuntoReciente[]; faltantes: string[] }) {
  const [st, dispatch, pend] = useActionState(guardarComprasBcraManual, undefined);

  return (
    <div className="admin-card">
      <h3 className="admin-preview-h">Compras BCRA (MULC) — carga manual</h3>
      <p className="admin-sub" style={{ margin: "0 0 10px" }}>
        La API oficial del BCRA llega con ~3-4 días hábiles de rezago. Cargá acá el dato del día
        que te falte (elegí la fecha) — se pisa solo, sin que tengas que borrar nada, en cuanto la
        ingesta automática trae el valor oficial de esa fecha. Alimenta el panel de{" "}
        <code>/dolar</code>.
      </p>
      {faltantes.length > 0 && (
        <p className="admin-sub" style={{ marginBottom: 10 }}>
          <b>Sin dato</b> (ni oficial ni manual) en: {faltantes.map(ddmmaaaa).join(", ")}.
        </p>
      )}
      <form action={dispatch}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="admin-field" style={{ flex: "0 0 160px" }}>
            <span>Fecha</span>
            <input name="fecha" className="admin-input" type="date" defaultValue={fechaDefault} required />
          </label>
          <label className="admin-field" style={{ flex: "1 1 160px" }}>
            <span>Monto (M USD, con signo)</span>
            <input
              name="monto"
              className="admin-input"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 120,5 o -30"
              required
            />
          </label>
        </div>
        <div className="admin-card-acciones">
          <button type="submit" className="admin-btn admin-btn-ok" disabled={pend}>
            {pend ? "Guardando…" : "Guardar"}
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
                <b>{ddmmaaaa(r.fecha)}</b>: {r.montoMusd >= 0 ? "+" : ""}
                {r.montoMusd.toString().replace(".", ",")} M USD
                {r.fuente === "manual" ? " (carga manual, se pisa con el oficial)" : " (oficial)"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

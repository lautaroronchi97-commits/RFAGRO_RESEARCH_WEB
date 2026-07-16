"use client";

import { useActionState } from "react";
import { crearEmpresa, type AdminState } from "../actions";

/**
 * Form para crear una empresa nueva. Las 7 secciones vienen marcadas por defecto
 * (el admin destilda las que no correspondan).
 */
export function EmpresaCrear({ secciones }: { secciones: { key: string; label: string }[] }) {
  const [st, action, pend] = useActionState<AdminState, FormData>(crearEmpresa, undefined);

  return (
    <details className="admin-crear">
      <summary>+ Nueva empresa</summary>
      <form action={action} className="admin-crear-form">
        <label className="admin-field">
          <span>Nombre</span>
          <input className="admin-input" type="text" name="nombre" placeholder="Ej. Acopio San Martín" autoComplete="off" required />
        </label>
        <fieldset className="admin-secciones-fs">
          <legend>Secciones habilitadas</legend>
          <div className="admin-secciones">
            {secciones.map((s) => (
              <label key={s.key} className="admin-check">
                <input type="checkbox" name="secciones" value={s.key} defaultChecked />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="admin-btn admin-btn-ok" disabled={pend}>
          {pend ? "Creando…" : "Crear empresa"}
        </button>
        {st?.error && <p className="admin-msg admin-msg-err" role="alert">{st.error}</p>}
        {st?.ok && <p className="admin-msg admin-msg-ok">{st.ok}</p>}
      </form>
    </details>
  );
}

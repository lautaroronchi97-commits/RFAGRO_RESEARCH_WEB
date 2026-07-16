"use client";

import { useActionState } from "react";
import { guardarEmpresa, type AdminState } from "../actions";

type Empresa = { id: string; nombre: string; secciones: string[]; n_usuarios: number };

/**
 * Editor de una empresa: renombrar + tildar las secciones habilitadas. Guardar
 * impacta de inmediato en los usuarios que heredan de esta empresa.
 */
export function EmpresaEditor({
  empresa,
  secciones,
}: {
  empresa: Empresa;
  secciones: { key: string; label: string }[];
}) {
  const [st, action, pend] = useActionState<AdminState, FormData>(guardarEmpresa, undefined);
  const activas = new Set(empresa.secciones);

  return (
    <article className="admin-card">
      <div className="admin-card-hd">
        <h3 className="admin-card-name">{empresa.nombre}</h3>
        <span className="admin-card-when">{empresa.n_usuarios} usuario{empresa.n_usuarios === 1 ? "" : "s"}</span>
      </div>

      <form action={action} className="admin-crear-form">
        <input type="hidden" name="empresa_id" value={empresa.id} />
        <label className="admin-field">
          <span>Nombre</span>
          <input className="admin-input" type="text" name="nombre" defaultValue={empresa.nombre} autoComplete="off" required />
        </label>
        <fieldset className="admin-secciones-fs">
          <legend>Secciones habilitadas</legend>
          <div className="admin-secciones">
            {secciones.map((s) => (
              <label key={s.key} className="admin-check">
                <input type="checkbox" name="secciones" value={s.key} defaultChecked={activas.has(s.key)} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="admin-btn admin-btn-ok" disabled={pend}>
          {pend ? "Guardando…" : "Guardar"}
        </button>
        {st?.error && <p className="admin-msg admin-msg-err" role="alert">{st.error}</p>}
        {st?.ok && <p className="admin-msg admin-msg-ok">{st.ok}</p>}
      </form>
    </article>
  );
}

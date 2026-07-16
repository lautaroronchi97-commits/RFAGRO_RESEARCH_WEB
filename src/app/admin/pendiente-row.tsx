"use client";

import { useActionState } from "react";
import { aprobarUsuario, rechazarUsuario, type AdminState } from "./actions";

type Pendiente = {
  id: string;
  nombre: string;
  email: string;
  empresa_texto: string;
  telefono: string;
  creado: string;
};

/**
 * Tarjeta de un registro pendiente. Aprobar: elegir una empresa existente o escribir
 * el nombre de una nueva (se crea con las 7 secciones). Rechazar: descarta el registro.
 */
export function PendienteRow({
  u,
  empresas,
}: {
  u: Pendiente;
  empresas: { id: string; nombre: string }[];
}) {
  const [stApr, aprobar, pendApr] = useActionState<AdminState, FormData>(aprobarUsuario, undefined);
  const [stRec, rechazar, pendRec] = useActionState<AdminState, FormData>(rechazarUsuario, undefined);

  return (
    <article className="admin-card">
      <div className="admin-card-hd">
        <div>
          <h3 className="admin-card-name">{u.nombre || "(sin nombre)"}</h3>
          <p className="admin-card-meta">
            {u.email}
            {u.telefono ? ` · ${u.telefono}` : ""}
          </p>
        </div>
        <span className="admin-card-when">{u.creado}</span>
      </div>

      <p className="admin-card-empresa">
        Empresa declarada: <b>{u.empresa_texto || "—"}</b>
      </p>

      <form action={aprobar} className="admin-aprobar">
        <input type="hidden" name="userId" value={u.id} />
        <label className="admin-field">
          <span>Asignar a empresa existente</span>
          <select name="empresa_id" className="admin-input" defaultValue="">
            <option value="">— Elegir empresa —</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>…o crear una nueva</span>
          <input
            className="admin-input"
            type="text"
            name="empresa_nueva"
            placeholder={u.empresa_texto || "Nombre de la empresa"}
            autoComplete="off"
          />
        </label>

        <div className="admin-card-acciones">
          <button type="submit" className="admin-btn admin-btn-ok" disabled={pendApr}>
            {pendApr ? "Aprobando…" : "Aprobar"}
          </button>
        </div>
      </form>

      <form action={rechazar} className="admin-rechazar">
        <input type="hidden" name="userId" value={u.id} />
        <button type="submit" className="admin-btn admin-btn-ghost" disabled={pendRec}>
          {pendRec ? "…" : "Rechazar"}
        </button>
      </form>

      {(stApr?.error || stRec?.error) && (
        <p className="admin-msg admin-msg-err" role="alert">
          {stApr?.error ?? stRec?.error}
        </p>
      )}
      {(stApr?.ok || stRec?.ok) && (
        <p className="admin-msg admin-msg-ok">{stApr?.ok ?? stRec?.ok}</p>
      )}
    </article>
  );
}

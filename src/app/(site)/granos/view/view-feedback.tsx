"use client";

import { useActionState } from "react";
import { guardarFeedback, type FeedbackState } from "./actions";

/**
 * Form de feedback por view: Lautaro califica el research semanal y la sesión
 * siguiente lo lee antes de escribir (loop de calibración de la skill view-mercado).
 */
export function ViewFeedback({ id, actual }: { id: string; actual: string | null }) {
  const [st, action, pend] = useActionState<FeedbackState, FormData>(guardarFeedback, undefined);
  return (
    <form action={action} className="vw-fb">
      <input type="hidden" name="id" value={id} />
      <label className="vw-fb-label" htmlFor={`fb-${id}`}>
        Tu feedback (lo lee la próxima sesión de research)
      </label>
      <textarea
        id={`fb-${id}`}
        name="feedback"
        defaultValue={actual ?? ""}
        rows={3}
        placeholder="¿La dirección se sostiene? ¿Qué argumento sobra o falta? ¿Suena a vos?"
      />
      <div className="vw-fb-foot">
        <button type="submit" disabled={pend} className="admin-btn admin-btn-ok">
          {pend ? "Guardando…" : "Guardar feedback"}
        </button>
        {st?.ok && <span className="vw-fb-ok">{st.ok}</span>}
        {st?.error && <span className="vw-fb-err">{st.error}</span>}
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { actualizarPassword, type FormState } from "@/app/auth/actions";

export function ActualizarForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(actualizarPassword, undefined);

  return (
    <form action={action} className="auth-form">
      <label className="auth-field">
        <span>Nueva contraseña</span>
        <input className="auth-input" type="password" name="password" autoComplete="new-password" minLength={8} required />
        <small className="auth-hint">Mínimo 8 caracteres.</small>
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

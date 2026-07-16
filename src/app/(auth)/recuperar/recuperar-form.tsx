"use client";

import { useActionState } from "react";
import { pedirRecupero, type FormState } from "@/app/auth/actions";

export function RecuperarForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(pedirRecupero, undefined);

  if (state?.ok) {
    return <p className="auth-ok" role="status">{state.ok}</p>;
  }

  return (
    <form action={action} className="auth-form">
      <label className="auth-field">
        <span>Email</span>
        <input className="auth-input" type="email" name="email" autoComplete="email" required />
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={pending}>
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}

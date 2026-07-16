"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ingresarConPassword, type FormState } from "@/app/auth/actions";

export function IngresarForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(ingresarConPassword, undefined);

  return (
    <form action={action} className="auth-form">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="auth-field">
        <span>Email</span>
        <input className="auth-input" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="auth-field">
        <span>Contraseña</span>
        <input className="auth-input" type="password" name="password" autoComplete="current-password" required />
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>

      <div className="auth-links">
        <Link href="/recuperar">Olvidé mi contraseña</Link>
      </div>
    </form>
  );
}

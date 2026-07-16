"use client";

import { useActionState } from "react";
import { completarPerfil, type FormState } from "@/app/auth/actions";

export function CompletarForm({ nombre }: { nombre: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(completarPerfil, undefined);

  return (
    <form action={action} className="auth-form">
      <label className="auth-field">
        <span>Nombre y apellido</span>
        <input className="auth-input" type="text" name="nombre" autoComplete="name" defaultValue={nombre} required />
      </label>
      <label className="auth-field">
        <span>Empresa</span>
        <input className="auth-input" type="text" name="empresa" autoComplete="organization" required />
      </label>
      <label className="auth-field">
        <span>Teléfono</span>
        <input className="auth-input" type="tel" name="telefono" autoComplete="tel" required />
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { registrarConPassword, type FormState } from "@/app/auth/actions";

export function RegistroForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registrarConPassword, undefined);

  return (
    <form action={action} className="auth-form">
      <label className="auth-field">
        <span>Nombre y apellido</span>
        <input className="auth-input" type="text" name="nombre" autoComplete="name" required />
      </label>
      <label className="auth-field">
        <span>Empresa</span>
        <input className="auth-input" type="text" name="empresa" autoComplete="organization" required />
      </label>
      <label className="auth-field">
        <span>Teléfono</span>
        <input className="auth-input" type="tel" name="telefono" autoComplete="tel" required />
      </label>
      <label className="auth-field">
        <span>Email</span>
        <input className="auth-input" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="auth-field">
        <span>Contraseña</span>
        <input className="auth-input" type="password" name="password" autoComplete="new-password" minLength={8} required />
        <small className="auth-hint">Mínimo 8 caracteres.</small>
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}

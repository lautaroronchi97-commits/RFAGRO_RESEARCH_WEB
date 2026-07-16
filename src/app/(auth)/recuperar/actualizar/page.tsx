import type { Metadata } from "next";
import { ActualizarForm } from "./actualizar-form";

export const metadata: Metadata = { title: "Nueva contraseña · RF AGRO" };

/**
 * Pantalla a la que llega el usuario tras clickear el enlace del email de recupero.
 * Supabase deja una sesión de recuperación activa (vía el fragmento del link), así que
 * el `updateUser({ password })` de la server action funciona sin más.
 */
export default function ActualizarPasswordPage() {
  return (
    <div className="auth-card">
      <h1 className="auth-title">Elegí una nueva contraseña</h1>
      <p className="auth-sub">Escribí tu nueva contraseña para volver a entrar.</p>
      <ActualizarForm />
    </div>
  );
}

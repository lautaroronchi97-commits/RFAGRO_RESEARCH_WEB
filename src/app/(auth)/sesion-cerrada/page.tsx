import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sesión cerrada · RF AGRO" };

/**
 * Pantalla a la que el proxy manda cuando la sesión de este dispositivo dejó de ser
 * la vigente (Etapa 3, sesión única):
 *  - por defecto: otro dispositivo tomó la cuenta ("se abrió en otro dispositivo").
 *  - `?motivo=expirada`: 7 días sin actividad → re-login.
 * La sesión local ya quedó cerrada (el proxy hizo signOut local); acá solo se explica
 * y se ofrece volver a ingresar.
 */
export default async function SesionCerradaPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const expirada = motivo === "expirada";

  return (
    <div className="auth-card">
      <h1 className="auth-title">
        {expirada ? "Tu sesión expiró" : "Tu cuenta se abrió en otro dispositivo"}
      </h1>
      <p className="auth-sub">
        {expirada ? (
          <>
            Pasaron varios días sin actividad, así que cerramos la sesión por seguridad.
            Volvé a ingresar para seguir viendo el research.
          </>
        ) : (
          <>
            Detectamos un ingreso con tu cuenta en otro dispositivo. Por seguridad, cada
            cuenta puede tener una sola sesión activa, así que esta se cerró. Si no fuiste
            vos, cambiá tu contraseña.
          </>
        )}
      </p>

      <Link href="/ingresar" className="auth-btn auth-btn-primary">
        Volver a ingresar
      </Link>

      {!expirada && (
        <p className="auth-alt">
          <Link href="/recuperar">Cambiar mi contraseña</Link>
        </p>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { cerrarSesion } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Cuenta pendiente · ROFO AGRO" };

export default async function PendientePage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { nuevo } = await searchParams;

  return (
    <div className="auth-card">
      <h1 className="auth-title">Cuenta pendiente de aprobación</h1>
      {nuevo ? (
        <p className="auth-sub">
          ¡Listo! Recibimos tu registro. El equipo de ROFO AGRO va a revisar tu cuenta y habilitarte el acceso.
          Si te registraste con email, revisá tu casilla para confirmar la dirección.
        </p>
      ) : (
        <p className="auth-sub">
          Tu cuenta todavía no está habilitada. En cuanto el equipo de ROFO AGRO la apruebe vas a poder ver el research.
        </p>
      )}

      <p className="auth-note">
        ¿Dudas? Escribinos y te damos una mano.
      </p>

      <form action={cerrarSesion}>
        <button type="submit" className="auth-btn auth-btn-ghost">Cerrar sesión</button>
      </form>

      <p className="auth-alt">
        <Link href="/ingresar">Volver a ingresar</Link>
      </p>
    </div>
  );
}

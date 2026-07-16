"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import { cerrarSesion } from "@/app/auth/actions";

/**
 * Control de sesión del header. Es un client component a propósito: lee el usuario
 * en el navegador (no en el server), así el header no opta por render dinámico y las
 * páginas siguen siendo estáticas/ISR. Solo se monta cuando AUTH_ENFORCED está prendido
 * (lo decide el server-side SiteHeader), por eso acá no re-chequea el flag.
 */
export function AuthMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setListo(true);
    });
  }, []);

  if (!listo) return null;

  if (!email) {
    return (
      <Link href="/ingresar" className="auth-menu-link">
        Ingresar
      </Link>
    );
  }

  return (
    <span className="auth-menu">
      <span className="auth-menu-email" title={email}>{email}</span>
      <form action={cerrarSesion}>
        <button type="submit" className="auth-menu-out">Salir</button>
      </form>
    </span>
  );
}

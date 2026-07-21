"use client";

import dynamic from "next/dynamic";

/**
 * Carga diferida de AuthMenu (y con él, @supabase/supabase-js) SOLO del lado del
 * cliente. Sin esto, el import estático de AuthMenu en site-header.tsx (Server
 * Component) manda el SDK completo de Supabase (~235 KB) al bundle de TODAS las
 * páginas públicas, aunque AUTH_ENFORCED esté apagado y nadie lo use.
 */
const AuthMenu = dynamic(() => import("./auth-menu").then((m) => m.AuthMenu), { ssr: false });

export function AuthMenuLazy() {
  return <AuthMenu />;
}

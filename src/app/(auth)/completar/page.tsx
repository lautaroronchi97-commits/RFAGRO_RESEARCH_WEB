import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser, getPerfil } from "@/lib/auth/dal";
import { CompletarForm } from "./completar-form";

export const metadata: Metadata = { title: "Completar registro · ROFO AGRO" };

/**
 * Paso posterior al OAuth de Google: Google nos da nombre y email, pero faltan la
 * empresa y el teléfono. Si el perfil ya está completo, no hay nada que hacer acá.
 */
export default async function CompletarPage() {
  const user = await getAuthUser();
  if (!user) redirect("/ingresar");
  const perfil = await getPerfil();
  if (perfil && perfil.empresa_texto && perfil.telefono) {
    redirect(perfil.estado === "aprobado" ? "/" : "/pendiente");
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Completá tu registro</h1>
      <p className="auth-sub">Falta un par de datos para terminar. Después tu cuenta queda pendiente de aprobación.</p>
      <CompletarForm nombre={perfil?.nombre ?? ""} />
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { GoogleButton } from "../google-button";
import { IngresarForm } from "./ingresar-form";

export const metadata: Metadata = { title: "Ingresar · RF AGRO" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="auth-card">
      <h1 className="auth-title">Ingresar</h1>
      <p className="auth-sub">Accedé al research de mercado de RF AGRO.</p>

      {error === "oauth" && (
        <p className="auth-error" role="alert">No se pudo iniciar sesión con Google. Probá de nuevo.</p>
      )}

      <GoogleButton next={next} />

      <div className="auth-sep"><span>o con tu email</span></div>

      <IngresarForm next={next} />

      <p className="auth-alt">
        ¿No tenés cuenta? <Link href="/registro">Registrate</Link>
      </p>
    </div>
  );
}

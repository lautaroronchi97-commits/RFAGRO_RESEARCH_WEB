import Link from "next/link";
import type { Metadata } from "next";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = { title: "Recuperar contraseña · ROFO AGRO" };

export default function RecuperarPage() {
  return (
    <div className="auth-card">
      <h1 className="auth-title">Recuperar contraseña</h1>
      <p className="auth-sub">Te enviamos un enlace para restablecer tu contraseña.</p>

      <RecuperarForm />

      <p className="auth-alt">
        <Link href="/ingresar">Volver a ingresar</Link>
      </p>
    </div>
  );
}

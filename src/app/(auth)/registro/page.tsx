import Link from "next/link";
import type { Metadata } from "next";
import { GoogleButton } from "../google-button";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crear cuenta · ROFO AGRO" };

export default function RegistroPage() {
  return (
    <div className="auth-card">
      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-sub">
        Registrate para acceder al research. Tu cuenta queda pendiente hasta que el equipo de ROFO AGRO la aprueba.
      </p>

      <GoogleButton />

      <div className="auth-sep"><span>o con tu email</span></div>

      <RegistroForm />

      <p className="auth-alt">
        ¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link>
      </p>
    </div>
  );
}

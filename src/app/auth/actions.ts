"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { authConfigured } from "@/lib/auth/env";
import { logAcceso } from "@/lib/auth/log";
import { notificarRegistro } from "@/lib/auth/emails";
import { ADMIN_SEED_EMAILS } from "@/lib/auth/config";

export type FormState = { error?: string; ok?: string } | undefined;

/** Origen del sitio para los links de email/OAuth (respeta el host real del request). */
async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function noConfig(): FormState {
  return { error: "El login todavía no está configurado. Faltan las credenciales de Supabase." };
}

/** Registro con email + contraseña (pide nombre, empresa y teléfono). */
export async function registrarConPassword(_state: FormState, formData: FormData): Promise<FormState> {
  if (!authConfigured()) return noConfig();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (nombre.length < 2) return { error: "Ingresá tu nombre y apellido." };
  if (empresa.length < 2) return { error: "Ingresá el nombre de tu empresa." };
  if (telefono.length < 6) return { error: "Ingresá un teléfono de contacto." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Ingresá un email válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, empresa_texto: empresa, telefono },
      emailRedirectTo: `${origin}/auth/callback?next=/pendiente`,
    },
  });

  if (error) {
    return { error: error.message.includes("already registered")
      ? "Ese email ya está registrado. Probá ingresar o recuperar la contraseña."
      : "No se pudo completar el registro. Probá de nuevo." };
  }

  // Aviso a los admins (salvo que el que se registra sea un admin sembrado, que
  // entra ya aprobado). Degrada solo si falta la API key de Resend.
  if (!ADMIN_SEED_EMAILS.includes(email)) {
    await notificarRegistro({ nombre, email, empresa, telefono });
  }

  redirect("/pendiente?nuevo=1");
}

/** Ingreso con email + contraseña. */
export async function ingresarConPassword(_state: FormState, formData: FormData): Promise<FormState> {
  if (!authConfigured()) return noConfig();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) return { error: "Completá email y contraseña." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message.includes("Email not confirmed")
      ? "Todavía no confirmaste tu email. Revisá tu casilla."
      : "Email o contraseña incorrectos." };
  }

  await logAcceso("login");
  redirect(next && next.startsWith("/") ? next : "/");
}

/** Pide el mail de recuperación de contraseña. */
export async function pedirRecupero(_state: FormState, formData: FormData): Promise<FormState> {
  if (!authConfigured()) return noConfig();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Ingresá un email válido." };

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/recuperar/actualizar` });

  // Respuesta neutra: no revelamos si el email existe o no.
  return { ok: "Si el email está registrado, te enviamos un enlace para restablecer la contraseña." };
}

/** Fija una contraseña nueva (tras clickear el link del email de recupero). */
export async function actualizarPassword(_state: FormState, formData: FormData): Promise<FormState> {
  if (!authConfigured()) return noConfig();

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No se pudo actualizar la contraseña. Pedí un nuevo enlace." };

  redirect("/?pwd=1");
}

/** Completa el perfil tras el OAuth de Google (nombre/empresa/teléfono faltantes). */
export async function completarPerfil(_state: FormState, formData: FormData): Promise<FormState> {
  if (!authConfigured()) return noConfig();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (nombre.length < 2) return { error: "Ingresá tu nombre y apellido." };
  if (empresa.length < 2) return { error: "Ingresá el nombre de tu empresa." };
  if (telefono.length < 6) return { error: "Ingresá un teléfono de contacto." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const { error } = await supabase
    .from("profiles")
    .update({ nombre, empresa_texto: empresa, telefono })
    .eq("id", user.id);
  if (error) return { error: "No se pudieron guardar tus datos. Probá de nuevo." };

  // Completar el perfil tras Google = el momento en que el registro queda listo:
  // avisamos a los admins (salvo admin sembrado, que ya entra aprobado).
  if (!ADMIN_SEED_EMAILS.includes((user.email ?? "").toLowerCase())) {
    await notificarRegistro({
      nombre,
      email: user.email ?? "",
      empresa,
      telefono,
    });
  }

  redirect("/pendiente?nuevo=1");
}

/** Cierra la sesión. */
export async function cerrarSesion(): Promise<void> {
  if (authConfigured()) {
    await logAcceso("logout");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/ingresar");
}

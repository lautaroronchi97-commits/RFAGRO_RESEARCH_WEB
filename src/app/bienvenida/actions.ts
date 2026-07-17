"use server";

import { enviarConsulta } from "@/lib/auth/emails";
import type { FormState } from "@/app/auth/actions";

/**
 * Formulario de contacto de la landing institucional (ítem 3 del backlog).
 * Es PÚBLICO: no requiere sesión (la landing la ven visitantes sin cuenta). Valida,
 * intenta enviar por Resend a los admins y siempre devuelve un acuse amable — nunca
 * promete "te contactamos", solo confirma que la consulta llegó. Degrada sin romper
 * si falta la key de Resend (el lead queda en los logs del server como backstop).
 */
export async function enviarConsultaAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  // Honeypot: un campo oculto que solo completan los bots.
  if (String(formData.get("website") ?? "").trim()) {
    return { ok: "¡Recibimos tu consulta! Gracias por escribirnos." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();

  if (!nombre || !email || !mensaje) {
    return { error: "Completá al menos tu nombre, tu email y un mensaje." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Revisá el email: no parece válido." };
  }
  if (mensaje.length > 4000) {
    return { error: "El mensaje es demasiado largo." };
  }

  await enviarConsulta({ nombre, email, telefono, empresa, mensaje });
  return { ok: "¡Recibimos tu consulta! Gracias por escribirnos." };
}

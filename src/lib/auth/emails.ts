import "server-only";

/**
 * Emails transaccionales del login vía Resend (ver docs/PLAN_LOGIN.md §3.5 y la guía
 * de setup). DEGRADA SIN ROMPER: si falta `RESEND_API_KEY`, loguea y sigue — el
 * registro/aprobación no dependen del email. Nunca tira (patrón Result del repo).
 *
 * Env:
 *  - RESEND_API_KEY  → clave de Resend (secreta). Sin ella, no se manda nada.
 *  - RESEND_FROM     → remitente (ej. "ROFO AGRO <research@tudominio.com>"). Default de
 *                      prueba: onboarding@resend.dev (solo llega al dueño de la cuenta).
 *  - ADMIN_EMAILS    → destinatarios del aviso de registro nuevo (coma-separados).
 *  - NEXT_PUBLIC_SITE_URL → base para los links del email (panel, ingreso).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.RESEND_FROM || "ROFO AGRO <onboarding@resend.dev>";
}

/** Lista de emails de admin (coma-separados) para los avisos de registro. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://rofoagro-research-web.vercel.app").replace(/\/$/, "");
}

/** Envía un email por Resend. Devuelve true si salió; degrada a false sin tirar. */
async function enviar(to: string[], subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[emails] RESEND_API_KEY ausente — no se envía "${subject}" a ${to.join(", ")}`);
    return false;
  }
  if (to.length === 0) return false;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[emails] Resend respondió ${res.status} para "${subject}"`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[emails] fallo enviando "${subject}"`, e);
    return false;
  }
}

/** Marco HTML sobrio, coherente con la marca (sin depender de imágenes externas). */
function plantilla(titulo: string, cuerpo: string): string {
  return `<!doctype html><html><body style="margin:0;background:#EDF2E3;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1a2b1a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #d8e2c8;border-radius:14px;overflow:hidden">
    <div style="background:#2F6E34;padding:16px 22px;color:#fff;font-weight:bold;letter-spacing:.5px">ROFO&nbsp;AGRO<span style="opacity:.7;font-weight:normal"> · Research de granos</span></div>
    <div style="padding:22px">
      <h1 style="margin:0 0 12px;font-size:19px;color:#2F6E34">${titulo}</h1>
      ${cuerpo}
    </div>
    <div style="padding:14px 22px;border-top:1px solid #eef2e6;font-size:12px;color:#7a887a">Este es un aviso automático de ROFO AGRO. No respondas a este correo.</div>
  </div></body></html>`;
}

/** Aviso a los admins de que hay un registro nuevo esperando aprobación. */
export async function notificarRegistro(datos: {
  nombre: string;
  email: string;
  empresa: string;
  telefono: string;
}): Promise<void> {
  const dests = adminEmails();
  if (dests.length === 0) {
    console.info("[emails] ADMIN_EMAILS vacío — no se avisa el registro nuevo");
    return;
  }
  const cuerpo = `
    <p style="margin:0 0 14px">Hay una cuenta nueva esperando aprobación:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#7a887a;width:110px">Nombre</td><td style="padding:6px 0"><b>${escapar(datos.nombre)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#7a887a">Email</td><td style="padding:6px 0">${escapar(datos.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a887a">Empresa</td><td style="padding:6px 0">${escapar(datos.empresa)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a887a">Teléfono</td><td style="padding:6px 0">${escapar(datos.telefono)}</td></tr>
    </table>
    <p style="margin:18px 0 0"><a href="${siteUrl()}/admin" style="display:inline-block;background:#2F6E34;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Revisar en el panel</a></p>`;
  await enviar(dests, "Nueva cuenta para aprobar · ROFO AGRO", plantilla("Registro nuevo", cuerpo));
}

/** Aviso al cliente de que su acceso quedó habilitado. */
export async function notificarAprobacion(email: string, nombre: string): Promise<void> {
  if (!email) return;
  const saludo = nombre ? `Hola ${escapar(nombre.split(" ")[0] ?? nombre)},` : "Hola,";
  const cuerpo = `
    <p style="margin:0 0 12px">${saludo}</p>
    <p style="margin:0 0 14px">Tu acceso al research de ROFO AGRO ya está <b>activo</b>. Podés ingresar cuando quieras.</p>
    <p style="margin:18px 0 0"><a href="${siteUrl()}/ingresar" style="display:inline-block;background:#2F6E34;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Ingresar</a></p>`;
  await enviar([email], "Tu acceso a ROFO AGRO está activo", plantilla("Acceso habilitado", cuerpo));
}

/**
 * Consulta desde el formulario de contacto de la landing institucional (ítem 3).
 * Envía a los admins (ADMIN_EMAILS). DEGRADA SIN ROMPER como el resto: si falta la
 * key, loguea el lead (backstop en los logs del server) y devuelve false. El server
 * action muestra igual un acuse amable al visitante.
 */
export async function enviarConsulta(datos: {
  nombre: string;
  email: string;
  telefono: string;
  empresa: string;
  mensaje: string;
}): Promise<boolean> {
  const dests = adminEmails();
  // Backstop: dejar el lead en los logs aunque no haya email configurado.
  console.info(
    `[consulta] ${datos.nombre} · ${datos.email} · ${datos.telefono} · ${datos.empresa} — ${datos.mensaje}`,
  );
  if (dests.length === 0) {
    console.info("[consulta] ADMIN_EMAILS vacío — no se envía el aviso de consulta");
    return false;
  }
  const cuerpo = `
    <p style="margin:0 0 14px">Nueva consulta desde la web:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#7a887a;width:110px">Nombre</td><td style="padding:6px 0"><b>${escapar(datos.nombre)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#7a887a">Email</td><td style="padding:6px 0">${escapar(datos.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a887a">Teléfono</td><td style="padding:6px 0">${escapar(datos.telefono)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a887a">Empresa</td><td style="padding:6px 0">${escapar(datos.empresa)}</td></tr>
    </table>
    <p style="margin:16px 0 6px;color:#7a887a;font-size:13px">Mensaje</p>
    <p style="margin:0;white-space:pre-wrap">${escapar(datos.mensaje)}</p>`;
  return enviar(dests, "Nueva consulta · ROFO AGRO", plantilla("Consulta desde la web", cuerpo));
}

/** Escape HTML mínimo para interpolar datos del usuario en el email. */
function escapar(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

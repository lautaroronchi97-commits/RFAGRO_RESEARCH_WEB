/**
 * Configuración central de autenticación (Etapa 1 del login — ver docs/PLAN_LOGIN.md).
 *
 * Regla de oro de esta etapa: con `AUTH_ENFORCED` APAGADO la web es idéntica a
 * como era antes del login (el proxy hace passthrough y el layout no lee cookies,
 * así se preserva el render estático/ISR de las páginas de datos). El gate solo se
 * activa cuando Lautaro prende el flag por variable de entorno en Vercel.
 */

/** Interruptor maestro. Apagado por defecto: la web sigue pública como hoy. */
export const AUTH_ENFORCED = process.env.AUTH_ENFORCED === "true";

/**
 * Admin(s) sembrados: al registrarse con uno de estos emails, el trigger de la
 * base los marca rol=admin + estado=aprobado (no pasan por aprobación). Mauro se
 * promueve a admin desde el panel (Etapa 2) cuando se registre — decisión 10 del plan.
 * (Mismo listado hardcodeado en la migración `handle_new_user`; mantener en sync.)
 */
export const ADMIN_SEED_EMAILS = ["lautaroronchi97@gmail.com"];

/** Las 7 secciones del sitio (claves canónicas de la nav). Permisos por sección = Etapa 2. */
export const SECCIONES = [
  "granos",
  "dolar",
  "comercio",
  "calculadoras",
  "graficos",
  "produccion",
  "noticias",
] as const;
export type SeccionKey = (typeof SECCIONES)[number];

/**
 * Prefijos de ruta que NUNCA exigen login (aunque el flag esté prendido): las
 * propias pantallas de auth y el callback de OAuth. Todo lo demás queda detrás
 * del gate. La landing pública en `/` se agrega en la Etapa 3.
 */
export const RUTAS_PUBLICAS = ["/ingresar", "/registro", "/pendiente", "/recuperar", "/completar", "/auth"];

/** ¿La ruta es una de las públicas de auth? (match por prefijo de segmento). */
export function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

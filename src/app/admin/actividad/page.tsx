import Link from "next/link";
import {
  getActividad,
  contarActividad,
  getUsuarios,
  getEmpresas,
  fmtFechaHora,
  parseUserAgent,
} from "@/lib/auth/admin";
import { nombreSeccion } from "@/lib/auth/config";

const POR_PAGINA = 50;

const EVENTO_LABEL: Record<string, string> = {
  login: "Ingreso",
  logout: "Salida",
  seccion: "Sección",
  kickeado: "Sesión cerrada",
};

type SP = { user?: string; empresa?: string; desde?: string; hasta?: string; page?: string };

/**
 * Pantalla ACTIVIDAD: historial de access_log (ingresos, salidas, secciones
 * visitadas, sesiones cerradas) con filtros por usuario/empresa/fecha y paginación.
 * Todo server-rendered vía searchParams (los filtros son un form GET).
 */
export default async function ActividadPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * POR_PAGINA;

  const filtro = {
    user: sp.user || undefined,
    empresa: sp.empresa || undefined,
    desde: sp.desde ? `${sp.desde}T00:00:00` : undefined,
    hasta: sp.hasta ? `${sp.hasta}T23:59:59.999` : undefined,
  };

  const [rows, total, usuarios, empresas] = await Promise.all([
    getActividad({ ...filtro, limit: POR_PAGINA, offset }),
    contarActividad(filtro),
    getUsuarios(),
    getEmpresas(),
  ]);

  const desde = offset + 1;
  const hasta = offset + rows.length;
  const hayPrev = page > 1;
  const hayNext = offset + rows.length < total;

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (sp.user) params.set("user", sp.user);
    if (sp.empresa) params.set("empresa", sp.empresa);
    if (sp.desde) params.set("desde", sp.desde);
    if (sp.hasta) params.set("hasta", sp.hasta);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin/actividad?${s}` : "/admin/actividad";
  };

  return (
    <section>
      <div className="admin-hd">
        <h1 className="admin-h1">Actividad</h1>
        <p className="admin-sub">Quién abrió la web y cuándo, qué secciones visitó, y desde qué dispositivo.</p>
      </div>

      <form className="admin-filtros" method="get">
        <label className="admin-field">
          <span>Usuario</span>
          <select name="user" className="admin-input admin-input-sm" defaultValue={sp.user ?? ""}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre || u.email}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Empresa</span>
          <select name="empresa" className="admin-input admin-input-sm" defaultValue={sp.empresa ?? ""}>
            <option value="">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Desde</span>
          <input type="date" name="desde" className="admin-input admin-input-sm" defaultValue={sp.desde ?? ""} />
        </label>
        <label className="admin-field">
          <span>Hasta</span>
          <input type="date" name="hasta" className="admin-input admin-input-sm" defaultValue={sp.hasta ?? ""} />
        </label>
        <div className="admin-filtros-acciones">
          <button type="submit" className="admin-btn admin-btn-ok">Filtrar</button>
          <Link href="/admin/actividad" className="admin-btn admin-btn-ghost">Limpiar</Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="admin-empty">Sin actividad para esos filtros.</p>
      ) : (
        <>
          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Empresa</th>
                  <th>Evento</th>
                  <th>Dispositivo</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ua = parseUserAgent(r.user_agent);
                  return (
                    <tr key={r.id}>
                      <td className="admin-td-ts">{fmtFechaHora(r.ts)}</td>
                      <td>
                        <div className="admin-td-nombre">{r.nombre || "—"}</div>
                        <div className="admin-td-email">{r.email}</div>
                      </td>
                      <td>{r.empresa_nombre ?? "—"}</td>
                      <td>
                        <span className={`admin-ev ev-${r.evento}`}>{EVENTO_LABEL[r.evento] ?? r.evento}</span>
                        {r.evento === "seccion" && r.seccion && (
                          <span className="admin-ev-sec"> · {nombreSeccion(r.seccion)}</span>
                        )}
                      </td>
                      <td>
                        {ua.dispositivo}
                        <span className="admin-td-nav"> · {ua.navegador}</span>
                      </td>
                      <td className="admin-td-ip">{r.ip ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-pag">
            <span className="admin-pag-info">
              {desde}–{hasta} de {total}
            </span>
            <div className="admin-pag-btns">
              {hayPrev ? (
                <Link href={qs(page - 1)} className="admin-btn admin-btn-ghost">← Anterior</Link>
              ) : (
                <span className="admin-btn admin-btn-ghost is-off">← Anterior</span>
              )}
              {hayNext ? (
                <Link href={qs(page + 1)} className="admin-btn admin-btn-ghost">Siguiente →</Link>
              ) : (
                <span className="admin-btn admin-btn-ghost is-off">Siguiente →</span>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

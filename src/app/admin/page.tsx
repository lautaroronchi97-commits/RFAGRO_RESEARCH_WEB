import { getPendientes, getEmpresas, fmtFechaHora } from "@/lib/auth/admin";
import { PendienteRow } from "./pendiente-row";

/**
 * Pantalla PENDIENTES (landing del panel): registros esperando aprobación. Por cada
 * uno, el admin elige empresa (existente o nueva) y aprueba, o rechaza.
 */
export default async function PendientesPage() {
  const [pendientes, empresas] = await Promise.all([getPendientes(), getEmpresas()]);
  const opcionesEmpresa = empresas.map((e) => ({ id: e.id, nombre: e.nombre }));

  return (
    <section>
      <div className="admin-hd">
        <h1 className="admin-h1">Pendientes de aprobación</h1>
        <p className="admin-sub">
          Cuentas nuevas que todavía no ven ningún dato. Al aprobar, asignales una empresa
          (sus permisos por sección se heredan de ella).
        </p>
      </div>

      {pendientes.length === 0 ? (
        <p className="admin-empty">No hay registros pendientes. 🎉</p>
      ) : (
        <div className="admin-cards">
          {pendientes.map((u) => (
            <PendienteRow
              key={u.id}
              u={{
                id: u.id,
                nombre: u.nombre,
                email: u.email,
                empresa_texto: u.empresa_texto,
                telefono: u.telefono,
                creado: fmtFechaHora(u.created_at),
              }}
              empresas={opcionesEmpresa}
            />
          ))}
        </div>
      )}
    </section>
  );
}

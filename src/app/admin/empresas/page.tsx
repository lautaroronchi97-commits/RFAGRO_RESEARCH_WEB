import { getEmpresas } from "@/lib/auth/admin";
import { SECCIONES_META } from "@/lib/auth/config";
import { EmpresaEditor } from "./empresa-editor";
import { EmpresaCrear } from "./empresa-crear";

/**
 * Pantalla EMPRESAS: crear/renombrar y editar los permisos por sección (checkboxes
 * de las 7 secciones). Los usuarios de una empresa heredan estas secciones (salvo
 * override individual). Muestra cuántos usuarios tiene cada una.
 */
export default async function EmpresasPage() {
  const empresas = await getEmpresas();
  const secciones = SECCIONES_META.map((s) => ({ key: s.key, label: s.label }));

  return (
    <section>
      <div className="admin-hd">
        <h1 className="admin-h1">Empresas</h1>
        <p className="admin-sub">Las secciones marcadas son las que ven los usuarios de cada empresa.</p>
      </div>

      <EmpresaCrear secciones={secciones} />

      {empresas.length === 0 ? (
        <p className="admin-empty">Todavía no hay empresas. Creá la primera arriba.</p>
      ) : (
        <div className="admin-cards">
          {empresas.map((e) => (
            <EmpresaEditor
              key={e.id}
              empresa={{ id: e.id, nombre: e.nombre, secciones: e.secciones, n_usuarios: Number(e.n_usuarios) }}
              secciones={secciones}
            />
          ))}
        </div>
      )}
    </section>
  );
}

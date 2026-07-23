import { requireAdmin } from "@/lib/auth/dal";
import { getInterpretacionesAdmin } from "@/lib/interpretaciones";
import { InterpretacionEditor } from "./interpretacion-editor";

function ddmmaaaa(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Pestaña INTERPRETACIONES del panel admin (MP4 de docs/PLAN_INFORMES.md, ítem 21): los
 * borradores que la skill informe-diario genera solos cuando detecta un informe de
 * organismo nuevo (USDA/CONAB/BCR-GEA/DEA-SAGyP) en estimaciones_produccion. Lautaro los
 * edita y publica acá — nada sale a /produccion sin su OK.
 */
export default async function InterpretacionesPage() {
  await requireAdmin();
  const filas = await getInterpretacionesAdmin();
  const borradores = filas.filter((f) => f.estado === "borrador");
  const historial = filas.filter((f) => f.estado !== "borrador");

  return (
    <section>
      <div className="admin-hd">
        <h1 className="admin-h1">Interpretaciones de informes</h1>
        <p className="admin-sub">
          Lectura en lenguaje llano de los informes de organismos (USDA, CONAB, BCR-GEA, DEA-SAGyP)
          que la skill del informe diario genera sola cuando detecta una publicación nueva. Editá y
          publicá desde acá — la interpretación publicada aparece en <code>/produccion</code>, junto
          a los cambios del organismo correspondiente. Nada se publica sin que lo confirmes vos.
        </p>
      </div>

      {borradores.length === 0 ? (
        <p className="admin-empty">
          No hay borradores esperando revisión. Aparecen solos el día que se publica un informe de
          organismo nuevo (post-cierre, con el resto del informe diario).
        </p>
      ) : (
        <div className="admin-cards">
          {borradores.map((it) => (
            <InterpretacionEditor key={it.id} item={it} />
          ))}
        </div>
      )}

      {historial.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 className="admin-h1" style={{ fontSize: "1.2rem" }}>Historial</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l">Fecha informe</th>
                  <th className="l">Organismo</th>
                  <th className="l">Informe</th>
                  <th className="l">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((it) => (
                  <tr key={it.id}>
                    <td className="num">{ddmmaaaa(it.fecha_publicacion)}</td>
                    <td className="l">
                      <span className={`cal-org org-${it.organismo}`}>{it.organismo}</span>
                    </td>
                    <td className="l">{it.informe}</td>
                    <td className="l">{it.estado === "publicado" ? "✅ Publicada" : "descartada"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

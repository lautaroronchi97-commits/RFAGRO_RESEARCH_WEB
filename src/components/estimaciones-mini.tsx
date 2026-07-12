import Link from "next/link";
import { sbSelectAll } from "@/lib/supabase";
import type { Meta } from "@/lib/market";
import { nfmt, sfmt } from "@/lib/format";
import { parseRows, construirPizarra, GRANO_LABEL, PAIS_LABEL } from "@/lib/estimaciones";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";

const GRANOS = ["soja", "maiz", "trigo"];
const PAISES = ["argentina", "brasil", "eeuu", "mundo"];

/**
 * Mini-tabla de la home: última producción de USDA (WASDE) para soja/maíz/trigo por país, con el Δ
 * vs. la publicación anterior. Si la tabla `estimaciones_produccion` está vacía (las ingestas todavía
 * no corrieron), no renderiza nada — así la home no se ve afectada hasta que haya datos reales.
 * El detalle completo (todos los organismos, área/rinde, evolución) vive en /produccion.
 */
export async function EstimacionesMini() {
  const res = await sbSelectAll(
    "estimaciones_produccion?select=organismo,pais,grano,campania,variable,valor,unidad,fecha_publicacion,informe,url&organismo=eq.USDA&variable=eq.produccion&order=fecha_publicacion.asc",
    3600,
  );
  const rows = res.ok ? parseRows(res.data) : [];
  if (rows.length === 0) return null;

  const pizarra = construirPizarra(rows);
  // celda[grano][pais] = { produccion, deltaProd, campania }
  const cel = new Map<string, (typeof pizarra)[number]>();
  for (const c of pizarra) cel.set(`${c.grano}|${c.pais}`, c);

  const maxFecha = rows.reduce((m, r) => (r.fecha_publicacion > m ? r.fecha_publicacion : m), rows[0].fecha_publicacion);
  const updatedAt = Date.parse(`${maxFecha}T00:00:00-03:00`);
  const meta: Meta = {
    source: "USDA",
    updatedAt: Number.isNaN(updatedAt) ? null : updatedAt,
    status: "real",
    problemas: [],
  };

  return (
    <Panel id="estimaciones-mini">
      <PanelHead
        title="Última estimación de producción"
        sub="USDA — millones de t"
        stamp={<SourceStamp meta={meta} />}
      />
      <div className="estim-mini-wrap">
        <table className="estim-mini">
          <thead>
            <tr>
              <th className="l">Grano</th>
              {PAISES.map((p) => (
                <th className="r" key={p}>{PAIS_LABEL[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRANOS.map((g) => (
              <tr key={g}>
                <td className="l estim-grano">{GRANO_LABEL[g]}</td>
                {PAISES.map((p) => {
                  const c = cel.get(`${g}|${p}`);
                  return (
                    <td className="r num" key={p}>
                      {c && c.produccion != null ? (
                        <span className="estim-mini-cell">
                          <span className="estim-mini-val">{nfmt(c.produccion, 1)}</span>
                          {c.deltaProd != null && c.deltaProd !== 0 && (
                            <span className={`estim-mini-d ${c.deltaProd > 0 ? "up" : "down"}`}>
                              {c.deltaProd > 0 ? "▲" : "▼"}{sfmt(c.deltaProd, 1)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="estim-flat">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Campaña vigente</span> según USDA, con el cambio vs. la publicación anterior. La
          comparación entre organismos (USDA, CONAB, BCR…), el área/rinde y la evolución están en{" "}
          <Link href="/produccion" className="cal-inline-link">Producción</Link>.
        </span>
      </div>
    </Panel>
  );
}

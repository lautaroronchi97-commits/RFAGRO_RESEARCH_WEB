import { getSenalCamiones, type SenalItem } from "@/lib/camiones/camiones";
import { nfmt } from "@/lib/format";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";

/**
 * Bloque SOLO MESA (requireAdmin, gateado por el caller): señal "barcos vs camiones"
 * (negocio/09_camiones_vs_lineup_senal.md) — diferencial de percentiles estacionales entre la
 * densidad de line-up (bodega esperando) y los camiones descargados (reposición física), por
 * producto (nacional) y por zona (Gran Rosario / Bahía Blanca).
 */

function IconSenal() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 13.5h12" />
      <path d="M4 13.5V8M8 13.5V5M12 13.5v-6" />
    </svg>
  );
}

const LECTURA_LABEL: Record<string, string> = {
  ALCISTA: "ALCISTA — bodega tensa, la reposición no acompaña",
  BAJISTA: "BAJISTA — camiones fuertes, sin cuello de botella",
  NEUTRO: "NEUTRO — flujo balanceado para la época",
  SIN_DATO: "sin historia suficiente todavía",
};

function FilaSenal({ item }: { item: SenalItem }) {
  const cls =
    item.senal.lectura === "ALCISTA" ? "pos" : item.senal.lectura === "BAJISTA" ? "neg" : "dim";
  return (
    <tr>
      <td className="l">{item.display}</td>
      <td>{item.senal.pctlLineup == null ? "—" : nfmt(item.senal.pctlLineup, 0)}</td>
      <td>{item.senal.pctlCamiones == null ? "—" : nfmt(item.senal.pctlCamiones, 0)}</td>
      <td className={cls} style={{ fontWeight: 700 }}>
        {item.senal.diferencial == null ? "—" : `${item.senal.diferencial > 0 ? "+" : ""}${nfmt(item.senal.diferencial, 0)}`}
      </td>
      <td className={cls}>{LECTURA_LABEL[item.senal.lectura]}</td>
    </tr>
  );
}

export async function SenalCamionesPanel() {
  const data = await getSenalCamiones();

  return (
    <Panel id="comercio-camiones-senal">
      <PanelHead glyph={<IconSenal />} title="Barcos vs camiones (mesa)" sub="Señal direccional — solo mesa" stamp={<SourceStamp meta={data.meta} />} />

      {data.porProducto.length === 0 && data.porZona.length === 0 ? (
        <p className="dim" style={{ padding: "8px 2px" }}>
          Sin historia suficiente todavía. {data.meta.problemas[0] ?? ""}
        </p>
      ) : (
        <>
          <h3 className="lu-h3">Por producto (nacional)</h3>
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l" scope="col">Producto</th>
                  <th scope="col">Pctl line-up</th>
                  <th scope="col">Pctl camiones</th>
                  <th scope="col">Diferencial</th>
                  <th className="l" scope="col">Lectura</th>
                </tr>
              </thead>
              <tbody>
                {data.porProducto.map((item) => (
                  <FilaSenal key={item.cod} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="lu-h3">Por zona</h3>
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l" scope="col">Zona</th>
                  <th scope="col">Pctl line-up</th>
                  <th scope="col">Pctl camiones</th>
                  <th scope="col">Diferencial</th>
                  <th className="l" scope="col">Lectura</th>
                </tr>
              </thead>
              <tbody>
                {data.porZona.map((item) => (
                  <FilaSenal key={item.cod} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <QueEsEsto
        paraQue={
          <>
            Cruza la <strong>demanda física</strong> (line-up de buques esperando carga, en percentil
            estacional) contra la <strong>reposición física</strong> (camiones descargados, media móvil
            de 7 días hábiles, mismo percentil). Un diferencial positivo grande (bodega en máximos, camiones
            flojos) es tensión <strong>alcista</strong>: el exportador puede pagar más para atraer
            mercadería. Un diferencial negativo (camiones en máximos sin bodega esperando) es{" "}
            <strong>bajista</strong> en el margen. Idea original de Lautaro, research en{" "}
            <code>docs/negocio/09_camiones_vs_lineup_senal.md</code>.
          </>
        }
        comoSeCalcula={
          <>
            SEÑAL = percentil estacional de la densidad de line-up (ETB ≤ 30 días, solo puertos
            argentinos) − percentil estacional de la media móvil 7 días de camiones. Ambos percentiles
            comparan el valor de hoy contra la misma fecha (±15 días) de años anteriores — nunca un
            ratio con umbral fijo. Umbral de &quot;neutro&quot; ±10 (provisorio, pendiente de calibración L4).
            Limitaciones conocidas: sin matriz zona×producto, consumo interno (molienda) mezclado con
            exportación, Gran Rosario no distingue Up River Norte/Sur.
          </>
        }
      />
    </Panel>
  );
}

import { getMesaEmbarque, type ProductoMesa } from "@/lib/lineup/embarque";
import { nfmt } from "@/lib/format";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";
import { EmbarquesCsv, type FilaCsv } from "./embarques-csv";

/**
 * Mesa de embarque: el programa de embarques declarado (DJVE) por mes × producto,
 * en el idioma de las posiciones A3, con el cruce físico contra el line-up SOLO
 * donde tiene sentido (el mes en curso — el line-up ve ~10 días hacia adelante).
 */

function IconEmbarque() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 4.5h9v3h-9zM4 4.5V2h4v2.5" />
      <path d="M1 10.5h14l-1.5 3h-11z" />
      <path d="M12 7.5l2.5 3M12 10.5V7.5" />
    </svg>
  );
}

function ddmm(iso: string | null): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—";
}

/** Toneladas → miles de t sin decimales ("3.854"). */
const kt = (v: number | null | undefined) =>
  v == null || v === 0 ? "—" : nfmt(Math.round(v / 1000), 0);

export async function MesaEmbarquePanel() {
  const data = await getMesaEmbarque();

  if (data.meses.length === 0 || data.productos.length === 0) {
    return (
      <Panel id="comercio-embarques">
        <PanelHead glyph={<IconEmbarque />} title="Mesa de embarque" sub="Programa declarado por mes" stamp={<SourceStamp meta={data.meta} />} />
        <p className="dim" style={{ padding: "8px 2px" }}>Sin programa de embarques disponible.</p>
      </Panel>
    );
  }

  const { meses, productos, cumplimiento, pico } = data;
  const lineupMes = cumplimiento.reduce((s, c) => s + c.embarcado, 0);
  const granosA3 = productos.filter((p) => p.celdas.some((c) => c.a3 !== null));

  const filasCsv: FilaCsv[] = productos.flatMap((p) =>
    p.celdas.map((c, i) => ({
      producto: p.display,
      mes: meses[i].label,
      campania: c.campLabel,
      declarado: c.declarado,
      disponible: c.disp,
      forward: c.fwd,
      lineup: c.embarcado,
      buques: c.buques,
      programaFinalAnioPasado: c.anioPrevio,
      posicionA3: c.a3 ? (c.a3.exacta ? c.a3.posicion : `→${c.a3.posicion}`) : null,
      ajusteA3: c.a3?.precio ?? null,
    })),
  );

  const maxFila = (p: ProductoMesa) => Math.max(...p.celdas.map((c) => c.declarado));

  return (
    <Panel id="comercio-embarques">
      <PanelHead
        glyph={<IconEmbarque />}
        title="Mesa de embarque"
        sub={`Programa DJVE por mes · line-up al ${ddmm(data.fechaLineup)}`}
        stamp={<SourceStamp meta={data.meta} />}
      />

      <div className="lu-kpis">
        <div className="lu-kpi">
          <span className="lu-kpi-v">{nfmt(data.totalFwdProximos / 1e6, 1)} Mt</span>
          <span className="lu-kpi-l">programa declarado próximos {meses.length - 1} meses</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{pico ? `${pico.display} ${pico.label}` : "—"}</span>
          <span className="lu-kpi-l">{pico ? `mes más cargado (${nfmt(pico.ton / 1e6, 1)} Mt)` : "mes más cargado"}</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{nfmt(lineupMes / 1e6, 1)} Mt</span>
          <span className="lu-kpi-l">line-up del mes en curso ({meses[0].label})</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 className="lu-h3">Programa declarado por mes · miles de toneladas</h3>
        <EmbarquesCsv filas={filasCsv} hoy={data.hoy} />
      </div>
      <p className="lu-nota">
        Lo declarado en DJVE para embarcar cada mes (ventanas mensuales de granel; opción 30 + opción 360).
        De {meses[1]?.label}{" "}en adelante es programa puro: el line-up recién &quot;ve&quot; los barcos ~10 días antes.
      </p>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Producto</th>
              {meses.map((m) => (
                <th key={m.mes} scope="col">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => {
              const max = maxFila(p);
              return (
                <tr key={p.cod}>
                  <td className="l sym">{p.display}</td>
                  {p.celdas.map((c, i) => (
                    <td
                      key={meses[i].mes}
                      className={c.declarado === 0 ? "dim" : undefined}
                      style={c.declarado > 0 && c.declarado === max ? { fontWeight: 700 } : undefined}
                      title={c.declarado > 0 ? `${meses[i].label} · disponible ${kt(c.disp)} kt · forward ${kt(c.fwd)} kt · campaña ${c.campLabel}` : undefined}
                    >
                      {kt(c.declarado)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="lu-h3">Mes en curso · {meses[0].label} — declarado vs line-up</h3>
      <p className="lu-nota">
        Único mes con cruce físico posible. Un line-up mayor al declarado del mes es esperable y sano:
        los buques de hoy cumplen DJVE de ventanas anteriores (con prórroga automática de 30 días y
        embarque anticipable 15 días). Leerlo como avance de cumplimiento, no como señal de precio.
      </p>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Producto</th>
              <th scope="col">Declarado del mes</th>
              <th scope="col">Line-up del mes</th>
              <th scope="col">Buques</th>
              <th scope="col" title="Line-up / declarado del mes">Cobertura del mes</th>
            </tr>
          </thead>
          <tbody>
            {cumplimiento.map((c) => (
              <tr key={c.display}>
                <td className="l sym">{c.display}</td>
                <td>{nfmt(c.declarado, 0)}</td>
                <td>{nfmt(c.embarcado, 0)}</td>
                <td>{nfmt(c.buques, 0)}</td>
                <td className="lu-mono">{c.ratio === null ? "—" : `${nfmt(c.ratio * 100, 0)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="lu-h3">En idioma A3 · granos que cotizan en Matba Rofex</h3>
      <p className="lu-nota">
        Cada mes del programa contra la posición A3 con la que se opera. &quot;Prog. final&quot; = lo que terminó
        declarado para el mismo mes de la campaña pasada (programa cerrado, sirve de escala). Cuando el mes
        no tiene posición propia, se lee contra la siguiente que cotiza (→).
      </p>
      {granosA3.map((p) => (
        <div key={p.cod}>
          <h4 className="lu-h3" style={{ fontSize: "0.82rem", opacity: 0.85 }}>{p.display}</h4>
          <div className="table-scroll">
            <table className="tbl" style={{ minWidth: 680 }}>
              <thead>
                <tr>
                  <th className="l" scope="col">Mes</th>
                  <th scope="col">Campaña</th>
                  <th scope="col">Declarado</th>
                  <th scope="col">Disponible</th>
                  <th scope="col">Forward</th>
                  <th scope="col">Prog. final año pasado</th>
                  <th scope="col">Posición A3</th>
                  <th scope="col">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {p.celdas.map((c, i) => (
                  <tr key={meses[i].mes}>
                    <td className="l sym">{meses[i].label}</td>
                    <td className="lu-mono">{c.campLabel}</td>
                    <td>{nfmt(c.declarado, 0)}</td>
                    <td className={c.disp === 0 ? "dim" : undefined}>{nfmt(c.disp, 0)}</td>
                    <td className={c.fwd === 0 ? "dim" : undefined}>{nfmt(c.fwd, 0)}</td>
                    <td className="dim">{c.anioPrevio === null ? "—" : nfmt(c.anioPrevio, 0)}</td>
                    <td className="lu-mono" title={c.a3 && !c.a3.exacta ? "El mes no tiene posición propia: se lee contra la siguiente que cotiza" : undefined}>
                      {c.a3 ? (c.a3.exacta ? c.a3.posicion : `→${c.a3.posicion}`) : "—"}
                    </td>
                    <td>{c.a3 ? nfmt(c.a3.precio, 1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <QueEsEsto
        paraQue="Muestra el programa de embarques que la exportación ya declaró (DJVE) mes por mes: cuánto hay comprometido para embarcar en agosto, septiembre, etc., y contra qué posición de A3 se lee cada mes. Un mes muy cargado = demanda de originación y logística concentrada en esa posición. El mes en curso además se cruza contra los barcos reales del line-up."
        comoSeCalcula="El declarado sale del registro público de DJVE (SAGyP), tomando la ventana de embarque que declara cada operación: por norma el granel declara períodos de 30 días, así que el mes es un dato preciso (las ventanas de ~90 días son carga en contenedores, el 0,3% del tonelaje, y se excluyen). La opción 30 es el disponible (la ventana arranca el día del registro); la opción 360 es el forward (que además obliga a pagar el 90% de los derechos a los 5 días hábiles: es compromiso caro, no un registro gratis). El line-up (ISA Agents) solo anticipa ~10 días, por eso los meses lejanos no se cruzan contra barcos. Ojo: el ritmo de DJVE se distorsiona alrededor de los cambios de retenciones (ver decretos 682/2025 y 423/2026)."
      />
    </Panel>
  );
}

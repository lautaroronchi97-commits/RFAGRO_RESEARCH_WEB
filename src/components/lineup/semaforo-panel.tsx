import { getSemaforo } from "@/lib/lineup/semaforo";
import { nfmt, sfmt } from "@/lib/format";
import { ratioFmt } from "@/lib/lineup/cobertura";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";

function IconSemaforo() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="1.5" width="5" height="13" rx="2.5" />
      <circle cx="8" cy="4.5" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="8" cy="11.5" r="1" />
    </svg>
  );
}

function ddmm(iso: string | null): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—";
}

const FISICO_TXT: Record<string, string> = { "ALCISTA FAS": "Corta · compra", BAJISTA: "Sobre-originada", NEUTRO: "En línea" };

export async function SemaforoPanel() {
  const data = await getSemaforo();

  return (
    <Panel id="comercio-semaforo">
      <PanelHead
        glyph={<IconSemaforo />}
        title="Semáforo físico → precio"
        sub={`Demanda de exportación vs capacidad de pago · ${ddmm(data.fecha)}`}
        stamp={<SourceStamp meta={data.meta} />}
      />

      <div className="sf-grid">
        {data.granos.map((g) => (
          <div key={g.key} className={`sf-card sf-${g.nivel}`}>
            <div className="sf-top">
              <span className="sf-grano">{g.nombre}</span>
              <span className="sf-nivel">{g.nivel}</span>
            </div>
            <div className="sf-titulo">{g.titulo}</div>
            <p className="sf-lectura">{g.lectura}</p>
            <div className="sf-metrics">
              <div className="sf-metric">
                <span className="sf-m-l">Físico</span>
                <span className="sf-m-v">{FISICO_TXT[g.fisico]}</span>
                <span className="sf-m-x">cobertura {ratioFmt(g.ratio)}</span>
              </div>
              <div className="sf-metric">
                <span className="sf-m-l">FAS teórico</span>
                <span className="sf-m-v">{g.fas != null ? `US$ ${nfmt(g.fas, 0)}` : "—"}</span>
                <span className="sf-m-x">capacidad de pago</span>
              </div>
              <div className="sf-metric">
                <span className="sf-m-l">Pizarra</span>
                <span className="sf-m-v">{g.pizarra != null ? `US$ ${nfmt(g.pizarra, 0)}` : "—"}</span>
                <span className="sf-m-x">{g.spread != null ? `FAS ${sfmt(g.spread, 0)} vs pizarra` : "disponible"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <QueEsEsto
        paraQue="Junta en una sola lectura las dos caras del mercado que la web ya mira por separado: la demanda FÍSICA de exportación (¿las fábricas están cortas y saliendo a comprar?) y el PRECIO que pueden pagar (FAS teórico = capacidad de pago, vs la pizarra). Sirve para leer si la demanda física le pone piso al disponible."
        comoSeCalcula="El eje físico sale del gap de cobertura por grano (DJVE declarada vs line-up originado a 60 días, con los umbrales de LineUps_Code); la soja suma poroto + harina + aceite convertidos a equivalente poroto. El eje precio es el spread entre el FAS teórico de la BCR y la pizarra CAC. La lectura combina ambos ejes: corta + FAS sobre la pizarra = piso firme; corta + FAS ajustado = sostiene sin margen; sobre-originada = demanda de corto floja. Es una lectura orientativa, no un número cerrado."
      />
    </Panel>
  );
}

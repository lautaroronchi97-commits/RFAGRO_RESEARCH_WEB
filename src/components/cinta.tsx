import type { CintaData } from "@/lib/market";
import { nfmt, pfmt, dirOf, arrowOf } from "@/lib/format";

/** Cinta de indicadores (módulo 0). Dólares en vivo; pizarra de ejemplo. */
export function Cinta({ data }: { data: CintaData }) {
  return (
    <section className="ribbon" aria-label="Cinta de indicadores de mercado">
      <div className="ribbon-vp">
        <div className="ribbon-track">
          {data.items.map((it) => {
            const dir = it.change === null ? null : dirOf(it.change);
            return (
              <span className="rib" key={it.label}>
                <span className="rl">{it.label}</span>
                <span className="rv">{nfmt(it.value, it.decimals)}</span>
                {dir && (
                  <span className={`rd ${dir}`}>
                    {arrowOf(dir)} {pfmt(it.change, 2)}
                  </span>
                )}
                {it.sample && (
                  <span className="rib-ej" title="Dato de ejemplo — pendiente pizarra CAC-BCR">
                    ej.
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

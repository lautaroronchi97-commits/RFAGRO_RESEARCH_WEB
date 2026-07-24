"use client";

import * as React from "react";
import { nfmt, sfmt, pfmt } from "@/lib/format";
import { calcularFasTeorico, diferencialVsPizarra, type CapacidadModeloCfg } from "@/lib/capacidad-modelo";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { InfoTip } from "./infotip";

/**
 * Tabla de capacidad de pago con TRES lecturas (BCR | Nuestro | Pizarra) + el diferencial de
 * cada modelo teórico contra la pizarra (sobrepagado/subpagado). "Nuestro" es editable: los
 * supuestos (retenciones, reintegro, gastos portuarios/comerciales, margen de riesgo) arrancan
 * sembrados por el servidor (`capacidad.ts` — desde los propios a/b/c de BCR) y se recalculan
 * en vivo acá, sin ir al servidor, con la misma fórmula pura de `capacidad-modelo.ts`.
 */

export type CapGranoClient = {
  underlying: string;
  nombre: string;
  fasBcr: number | null;
  pizarra: number | null;
  fobOficial: number | null;
  cfg: CapacidadModeloCfg; // supuestos default (sembrados por el servidor)
};

// Sorgo y girasol no tienen glifo propio todavía (solo soja/maíz/trigo tienen futuro A3) —
// se muestran sin ícono en vez de reusar uno ajeno.
function glyphFor(u: string) {
  if (u === "SOJ") return <GlyphSoja />;
  if (u === "MAI") return <GlyphMaiz />;
  if (u === "TRI") return <GlyphTrigo />;
  return null;
}
function glyphColor(u: string) {
  if (u === "SOJ") return "var(--brand-agro)";
  if (u === "MAI") return "var(--gold-text)";
  return "var(--brand-deep)";
}
const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

type CampoPct = "alicuotaDex" | "reintegro" | "gastosComercialesPct";
type CampoUsd = "gastosPortuariosUsd" | "margenRiesgoUsd";

export function CapacidadEditable({ granos }: { granos: CapGranoClient[] }) {
  const [cfgs, setCfgs] = React.useState<Record<string, CapacidadModeloCfg>>(() =>
    Object.fromEntries(granos.map((g) => [g.underlying, g.cfg])),
  );

  const setCampoPct = (u: string, campo: CampoPct, raw: string) => {
    const n = Number(raw.replace(",", "."));
    setCfgs((prev) => ({ ...prev, [u]: { ...prev[u]!, [campo]: Number.isFinite(n) ? n / 100 : 0 } }));
  };
  const setCampoUsd = (u: string, campo: CampoUsd, raw: string) => {
    const n = Number(raw.replace(",", "."));
    setCfgs((prev) => ({ ...prev, [u]: { ...prev[u]!, [campo]: Number.isFinite(n) ? n : 0 } }));
  };
  const resetear = (u: string, cfgDefault: CapacidadModeloCfg) =>
    setCfgs((prev) => ({ ...prev, [u]: cfgDefault }));

  const filas = granos.map((g) => {
    const cfg = cfgs[g.underlying] ?? g.cfg;
    const fasNuestro = calcularFasTeorico(g.fobOficial, cfg);
    const diffBcr = diferencialVsPizarra(g.pizarra, g.fasBcr);
    const diffNuestro = diferencialVsPizarra(g.pizarra, fasNuestro);
    const editado = JSON.stringify(cfg) !== JSON.stringify(g.cfg);
    return { g, cfg, fasNuestro, diffBcr, diffNuestro, editado };
  });

  return (
    <div>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Grano</th>
              <th scope="col">
                <InfoTip term="BCR">
                  FAS teórico que publica la Bolsa de Comercio de Rosario, columna SAGyP (FOB oficial −
                  derechos de exportación − gastos portuarios − gastos comerciales).
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Nuestro">
                  FAS teórico RF AGRO: mismo FOB oficial (fuente independiente, SAGyP/MAGyP) con
                  supuestos de gastos EDITABLES (desplegá &quot;Ajustar supuestos&quot; abajo).
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Pizarra">
                  Precio del disponible en u$s (CAC) — lo que efectivamente paga hoy el mercado.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Dif. BCR">
                  Pizarra − FAS BCR. Positivo: el mercado paga por ENCIMA de lo teórico (sobrepagado,
                  bueno para el productor). Negativo: paga por DEBAJO (subpagado, hay margen sin trasladar).
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Dif. Nuestro">
                  Pizarra − FAS Nuestro, misma lectura que &quot;Dif. BCR&quot; pero contra el modelo propio.
                </InfoTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ g, fasNuestro, diffBcr, diffNuestro }) => (
              <tr key={g.underlying}>
                <td className="l">
                  <span className="grp-cell">
                    <span className="gglyph" style={{ color: glyphColor(g.underlying) }}>
                      {glyphFor(g.underlying)}
                    </span>
                    <span className="gname">{g.nombre}</span>
                  </span>
                </td>
                <td>{g.fasBcr != null ? nfmt(g.fasBcr, 2) : "—"}</td>
                <td className="b">{fasNuestro != null ? nfmt(fasNuestro, 2) : "—"}</td>
                <td className="dim">{g.pizarra != null ? nfmt(g.pizarra, 2) : "—"}</td>
                <td className={cls(diffBcr.usd)}>
                  {diffBcr.usd != null ? `${sfmt(diffBcr.usd, 1)} (${pfmt(diffBcr.pct, 1)})` : "—"}
                </td>
                <td className={cls(diffNuestro.usd)}>
                  {diffNuestro.usd != null ? `${sfmt(diffNuestro.usd, 1)} (${pfmt(diffNuestro.pct, 1)})` : "—"}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="l dim" colSpan={6}>
                  Sin datos de capacidad de pago todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <details className="qee">
        <summary className="qee-sum">Ajustar los supuestos de &quot;Nuestro&quot;</summary>
        <div className="qee-body">
          <p>
            Retenciones (alícuota vigente por decreto), reintegro, gastos portuarios (USD/tn), gastos
            comerciales (% del FOB) y un margen de riesgo del exportador explícito (BCR no lo modela —
            acá es una perilla, no un misterio). Arrancan sembrados de la propia planilla de BCR.
          </p>
          {filas.map(({ g, cfg, editado }) => (
            <div key={g.underlying} className="cap-cfg-row">
              <span className="grp-cell">
                <span className="gglyph" style={{ color: glyphColor(g.underlying) }}>
                  {glyphFor(g.underlying)}
                </span>
                <span className="gname">{g.nombre}</span>
              </span>
              <label className="cap-cfg-field">
                Retenciones %
                <input
                  type="number" inputMode="decimal" step="0.1" className="pz-input"
                  value={round1(cfg.alicuotaDex * 100)}
                  onChange={(e) => setCampoPct(g.underlying, "alicuotaDex", e.target.value)}
                  aria-label={`Retenciones % ${g.nombre}`}
                />
              </label>
              <label className="cap-cfg-field">
                Reintegro %
                <input
                  type="number" inputMode="decimal" step="0.1" className="pz-input"
                  value={round1(cfg.reintegro * 100)}
                  onChange={(e) => setCampoPct(g.underlying, "reintegro", e.target.value)}
                  aria-label={`Reintegro % ${g.nombre}`}
                />
              </label>
              <label className="cap-cfg-field">
                Gastos puerto USD/tn
                <input
                  type="number" inputMode="decimal" step="0.1" className="pz-input"
                  value={round1(cfg.gastosPortuariosUsd)}
                  onChange={(e) => setCampoUsd(g.underlying, "gastosPortuariosUsd", e.target.value)}
                  aria-label={`Gastos portuarios USD/tn ${g.nombre}`}
                />
              </label>
              <label className="cap-cfg-field">
                Gastos comerciales %
                <input
                  type="number" inputMode="decimal" step="0.1" className="pz-input"
                  value={round1(cfg.gastosComercialesPct * 100)}
                  onChange={(e) => setCampoPct(g.underlying, "gastosComercialesPct", e.target.value)}
                  aria-label={`Gastos comerciales % ${g.nombre}`}
                />
              </label>
              <label className="cap-cfg-field">
                Margen riesgo USD/tn
                <input
                  type="number" inputMode="decimal" step="0.1" className="pz-input"
                  value={round1(cfg.margenRiesgoUsd)}
                  onChange={(e) => setCampoUsd(g.underlying, "margenRiesgoUsd", e.target.value)}
                  aria-label={`Margen de riesgo USD/tn ${g.nombre}`}
                />
              </label>
              {editado && (
                <button type="button" className="pz-reset" title="Volver a los supuestos sembrados de BCR" onClick={() => resetear(g.underlying, g.cfg)}>
                  ↺
                </button>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

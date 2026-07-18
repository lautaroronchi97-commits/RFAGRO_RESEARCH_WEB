"use client";

import { useMemo, useState } from "react";
import { nfmt, sfmt } from "@/lib/format";
import { ratioFmt } from "@/lib/lineup/cobertura";
import type { EmpresaRow } from "@/lib/lineup/empresas";

/**
 * Tabla de empresas exportadoras: gap de cobertura (foto forward), avance de
 * campaña, standing y ritmo vs lo normal. Filtrable por señal + búsqueda, con
 * export CSV (el CSV lleva el detalle completo). Client: filtros en el navegador.
 */

function SenalBadge({ tag }: { tag: EmpresaRow["senal"]["tag"] }) {
  const cls = tag === "ALCISTA FAS" ? "sn-alcista" : tag === "BAJISTA" ? "sn-bajista" : "sn-neutro";
  const txt = tag === "ALCISTA FAS" ? "Alcista" : tag === "BAJISTA" ? "Bajista" : "Neutro";
  return <span className={`sn-badge ${cls}`}>{txt}</span>;
}

function RitmoCell({ r }: { r: EmpresaRow }) {
  if (r.ritmoRatio === null || r.ritmoNormal === null) return <td className="dim">—</td>;
  const pct = r.ritmoRatio - 1;
  const cls = pct > 0.15 ? "pos" : pct < -0.15 ? "neg" : "dim";
  return (
    <td className={cls} title={`Hoy ${nfmt(r.ritmoActual, 0)} t vs ${nfmt(r.ritmoNormal, 0)} t normal (${r.ritmoN} campañas)`}>
      {`${r.ritmoRatio.toFixed(1).replace(".", ",")}×`}
    </td>
  );
}

export function EmpresasTabla({ empresas, fecha }: { empresas: EmpresaRow[]; fecha: string | null }) {
  const [senal, setSenal] = useState("todas");
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return empresas
      .filter((e) => senal === "todas" || e.senal.tag === senal)
      .filter((e) => !needle || e.empresa.toLowerCase().includes(needle));
  }, [empresas, senal, q]);

  function exportarCsv() {
    const cols = ["Empresa", "Buques", "Standing_t", "Declarado_60d", "Originado_60d", "Falta_cubrir", "Cobertura", "Senal", "Declarado_campana", "Originado_campana", "Transito_PYUY", "Ritmo_actual", "Ritmo_normal", "Productos", "Zonas"];
    const esc = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lineas = [
      cols.join(","),
      ...filtradas.map((e) =>
        [e.empresa, e.buques, Math.round(e.standing), Math.round(e.declarado60d), Math.round(e.originado60d),
         Math.round(e.faltaCubrir), ratioFmt(e.ratio), e.senal.tag, Math.round(e.declaradoCamp), Math.round(e.originadoCamp),
         Math.round(e.transito), e.ritmoActual != null ? Math.round(e.ritmoActual) : "", e.ritmoNormal != null ? Math.round(e.ritmoNormal) : "",
         e.porProducto.map((p) => `${p.display} ${Math.round(p.ton)}`).join(" · "),
         e.porZona.map((z) => `${z.zona} ${Math.round(z.ton)}`).join(" · ")].map(esc).join(","),
      ),
    ];
    const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `empresas-comercio-${fecha ?? "hoy"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="lu-tabla">
      <div className="lu-filtros">
        <label className="lu-field">
          <span>Señal</span>
          <select value={senal} onChange={(e) => setSenal(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="ALCISTA FAS">Alcista (corta)</option>
            <option value="BAJISTA">Bajista</option>
            <option value="NEUTRO">Neutro</option>
          </select>
        </label>
        <label className="lu-field lu-grow">
          <span>Buscar</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Empresa…" />
        </label>
        <button type="button" className="lu-csv" onClick={exportarCsv} disabled={filtradas.length === 0}>↓ CSV</button>
      </div>

      <div className="lu-cuenta">{filtradas.length} {filtradas.length === 1 ? "empresa" : "empresas"}</div>

      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 880 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Empresa</th>
              <th scope="col">Buques</th>
              <th scope="col">Standing t</th>
              <th scope="col">Decl. 60d</th>
              <th scope="col">Orig. 60d</th>
              <th scope="col">Falta</th>
              <th scope="col" title="Originado / Declarado a 60 días">Cob.</th>
              <th className="l" scope="col">Señal</th>
              <th scope="col" title="Line-up parado hoy vs lo normal para esta época (5 campañas)">Ritmo</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((e) => (
              <tr key={e.empresa}>
                <td className="l sym">{e.empresa}</td>
                <td>{nfmt(e.buques, 0)}</td>
                <td>{nfmt(e.standing, 0)}</td>
                <td>{nfmt(e.declarado60d, 0)}</td>
                <td>{nfmt(e.originado60d, 0)}</td>
                <td className={e.faltaCubrir > 0 ? "pos" : e.faltaCubrir < 0 ? "neg" : "dim"}>{sfmt(e.faltaCubrir, 0)}</td>
                <td className="lu-mono">{ratioFmt(e.ratio)}</td>
                <td className="l"><SenalBadge tag={e.senal.tag} /></td>
                <RitmoCell r={e} />
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr><td className="l dim" colSpan={9}>Sin empresas para este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

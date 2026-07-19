"use client";

/**
 * Export CSV de la mesa de embarque (matriz completa en formato largo:
 * una fila por producto × mes, con el desglose disponible/forward, el line-up
 * del mes en curso, la referencia del año pasado y la posición A3).
 */

export type FilaCsv = {
  producto: string;
  mes: string; // "AGO26"
  campania: string;
  declarado: number;
  disponible: number;
  forward: number;
  lineup: number | null;
  buques: number | null;
  programaFinalAnioPasado: number | null;
  posicionA3: string | null;
  ajusteA3: number | null;
};

export function EmbarquesCsv({ filas, hoy }: { filas: FilaCsv[]; hoy: string }) {
  function exportar() {
    const cols = ["Producto", "Mes", "Campania", "Declarado_t", "Disponible_t", "Forward_t", "Lineup_t", "Buques", "Programa_final_anio_pasado_t", "Posicion_A3", "Ajuste_A3"];
    const esc = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lineas = [
      cols.join(","),
      ...filas.map((f) =>
        [f.producto, f.mes, f.campania, Math.round(f.declarado), Math.round(f.disponible), Math.round(f.forward),
         f.lineup != null ? Math.round(f.lineup) : "", f.buques ?? "",
         f.programaFinalAnioPasado != null ? Math.round(f.programaFinalAnioPasado) : "",
         f.posicionA3 ?? "", f.ajusteA3 ?? ""].map(esc).join(","),
      ),
    ];
    const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mesa-embarque-${hoy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="lu-csv" onClick={exportar} disabled={filas.length === 0}>
      ↓ CSV
    </button>
  );
}

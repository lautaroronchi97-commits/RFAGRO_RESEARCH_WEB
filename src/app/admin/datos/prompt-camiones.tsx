"use client";

import { useState } from "react";

/**
 * Prompt canónico para pedirle a Agrochat el export de camiones en puerto de Williams Entregas,
 * en el formato EXACTO que espera el uploader (tabla `camiones`). Mismo patrón que
 * `prompt-agrochat.tsx` (el de compras): Lautoro copia, cambia SERIE y DESDE/HASTA, pega en
 * Agrochat, sube el CSV que devuelva. Formato de columnas/fecha tomado 1:1 de los CSV reales ya
 * versionados en `data/camiones/` (Date + 4 columnas de zona; fecha "ene 2, 2018").
 */

const PROMPT = `Necesito la serie de entrada de camiones a puerto de Williams Entregas, en formato CSV, para cargar en un sistema. Seguí EXACTAMENTE estas reglas:

SERIE: Total (todos los productos)   (cambiar por el grano puntual si corresponde: Maíz / Trigo / Soja / Girasol / Sorgo / Cebada)
DESDE: 01/01/2026   HASTA: 22/07/2026   (cambiar el rango de fechas, formato DD/MM/AAAA)

FORMATO DE SALIDA
- Devolvé únicamente el CSV, sin ningún texto antes ni después y sin comillas ni bloques de código.
- Primera línea = esta cabecera EXACTA (con estos nombres, en este orden):
Date,Darsenas y Bs As,Puertos de Necochea,Puertos-B.Blanca,Rosario y Zona
- Una fila por cada día del rango pedido con actividad (los domingos/feriados sin actividad se pueden omitir).

COLUMNAS
- Date: la fecha en formato "mmm d, aaaa" con el mes abreviado en español y minúscula (ejemplo: "ene 2, 2018", "jul 22, 2026" — sin ceros a la izquierda en el día).
- Las 4 columnas siguientes: cantidad de CAMIONES (no toneladas) que entraron ese día a cada zona portuaria — Dársena Bs As-E. Ríos, Puerto Necochea, Puerto B. Blanca, Rosario y aledaños, EN ESE ORDEN.
- Si la SERIE es un grano puntual (no "Total"), las 4 columnas son los camiones de ESE grano únicamente en cada zona (mismo formato, mismas columnas).

UNIDADES (MUY IMPORTANTE)
- Son CANTIDAD DE CAMIONES (vehículos), NO toneladas. Números enteros, sin separador de miles.
- Celda vacía = 0 camiones esa zona ese día (no significa dato faltante).`;

export function PromptCamiones() {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el textarea de abajo queda para seleccionar a mano.
    }
  };

  return (
    <details className="admin-card" style={{ marginBottom: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        📋 Prompt para pedirle el export de camiones a Agrochat (copiá y cambiá SERIE/fechas)
      </summary>
      <p className="admin-sub" style={{ margin: "10px 0" }}>
        Williams Entregas (vía Agrochat) NO exporta los granos juntos por tamaño — un archivo por
        vez: el total sin filtrar, o un grano puntual. Copiá este prompt, cambiá{" "}
        <b>SERIE</b> (Total o el grano) y el rango <b>DESDE/HASTA</b>, pegalo en Agrochat y subí el
        CSV que devuelva eligiendo la misma serie en el selector de abajo.
      </p>
      <div className="admin-card-acciones" style={{ marginBottom: 8 }}>
        <button type="button" className="admin-btn admin-btn-ok" onClick={copiar}>
          {copiado ? "✓ Copiado" : "Copiar prompt"}
        </button>
      </div>
      <textarea
        className="admin-input"
        readOnly
        rows={20}
        value={PROMPT}
        style={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: "0.82rem", whiteSpace: "pre" }}
        onFocus={(e) => e.currentTarget.select()}
      />
    </details>
  );
}

import * as React from "react";

/**
 * Tabla de datos del gráfico: muestra, SIEMPRE visible debajo de cada chart,
 * los datos que lo componen (decisión de Lautaro: doble lectura gráfico + tabla,
 * sin toggle).
 *
 * Contrato (integradores):
 *   - El FORMATEO de números lo hace el caller (cada chart ya tiene sus
 *     formatters es-AR): la tabla recibe strings ya formateados (o números) y
 *     los muestra tal cual. `null`/faltante → "—".
 *   - `columnas[].align` default "right" (números); usar "left" para etiquetas
 *     (fecha, posición, etc.).
 *   - Series largas: scroll vertical propio (max-height ~320px) con header
 *     sticky; muchas columnas: scroll horizontal interno (nunca rompe el layout
 *     de la página).
 *
 * Server-safe: sin estado ni handlers, no agrega JS al cliente.
 */

export type ChartTablaColumna = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type ChartTablaFila = Record<string, string | number | null>;

export type ChartTablaProps = {
  /** Encabezado chico arriba de la tabla (default "Datos del gráfico"). */
  titulo?: string;
  columnas: ChartTablaColumna[];
  filas: ChartTablaFila[];
  /** Nota al pie (fuente, aclaración), opcional. */
  nota?: string;
};

export function ChartTabla({
  titulo = "Datos del gráfico",
  columnas,
  filas,
  nota,
}: ChartTablaProps) {
  return (
    <div className="ct">
      <div className="ct-hd">
        <span>{titulo}</span>
        {filas.length > 0 && (
          <span className="ct-n">
            {filas.length} {filas.length === 1 ? "fila" : "filas"}
          </span>
        )}
      </div>
      <div className="ct-scroll" tabIndex={0}>
        <table className="tbl">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.key} className={c.align === "left" ? "l" : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td className="ct-vacio" colSpan={columnas.length}>
                  Sin datos para mostrar
                </td>
              </tr>
            ) : (
              filas.map((fila, i) => (
                <tr key={i}>
                  {columnas.map((c) => {
                    const v = fila[c.key];
                    return (
                      <td key={c.key} className={c.align === "left" ? "l" : undefined}>
                        {v === null || v === undefined || v === "" ? "—" : v}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {nota && <p className="ct-nota">{nota}</p>}
    </div>
  );
}

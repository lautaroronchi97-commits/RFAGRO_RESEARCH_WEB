"use client";

/**
 * Filtro de grano (chips Todos/Soja/Maíz/Trigo), compartido por los paneles que
 * hoy listan los 3 granos mezclados (Arbitrajes, Pases, Monitor, Temperatura).
 * No cambia el dato: solo acota qué filas/tarjetas se muestran, client-side.
 * Si `presentes` trae 1 grano o menos, no vale la pena filtrar y no renderiza nada.
 */

export type GranoKey = "SOJ" | "MAI" | "TRI";
export type GranoFiltroValue = GranoKey | "todos";

const OPCIONES: { key: GranoKey; label: string }[] = [
  { key: "SOJ", label: "Soja" },
  { key: "MAI", label: "Maíz" },
  { key: "TRI", label: "Trigo" },
];

export function FiltroGrano({
  value,
  onChange,
  presentes,
}: {
  value: GranoFiltroValue;
  onChange: (g: GranoFiltroValue) => void;
  presentes?: GranoKey[];
}) {
  const opciones = presentes ? OPCIONES.filter((o) => presentes.includes(o.key)) : OPCIONES;
  if (opciones.length <= 1) return null;
  return (
    <div className="fg-bar" role="toolbar" aria-label="Filtrar por grano">
      <button type="button" className="fg-chip" aria-pressed={value === "todos"} onClick={() => onChange("todos")}>
        Todos
      </button>
      {opciones.map((o) => (
        <button
          key={o.key}
          type="button"
          className="fg-chip"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

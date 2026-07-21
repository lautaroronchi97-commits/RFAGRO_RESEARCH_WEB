"use client";

import { useState } from "react";

/**
 * Pestañas Calendario / Estimaciones para /produccion (E3 H8): la página era un scroll
 * de ~20.000px con las estimaciones enterradas al fondo. Los dos bloques (ambos ya
 * renderizados en el server) se pasan como props y se muestra uno a la vez.
 */
type Tab = "calendario" | "estimaciones";

export function ProduccionTabs({
  calendario,
  estimaciones,
}: {
  calendario: React.ReactNode;
  estimaciones: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("calendario");
  return (
    <>
      <div className="prod-tabs" role="tablist" aria-label="Vista de producción">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "calendario"}
          className={`prod-tab${tab === "calendario" ? " on" : ""}`}
          onClick={() => setTab("calendario")}
        >
          Calendario
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "estimaciones"}
          className={`prod-tab${tab === "estimaciones" ? " on" : ""}`}
          onClick={() => setTab("estimaciones")}
        >
          Estimaciones
        </button>
      </div>
      <div role="tabpanel">{tab === "calendario" ? calendario : estimaciones}</div>
    </>
  );
}

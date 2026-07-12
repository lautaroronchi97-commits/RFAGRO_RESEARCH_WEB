import * as React from "react";

/**
 * Bloque desplegable "¿Qué es esto?" (cerrado por defecto) con dos partes fijas:
 * para qué sirve y cómo se hacen las cuentas. Lenguaje llano, sin jerga técnica
 * ni fuentes. Usa <details> nativo (accesible, sin JS).
 */
export function QueEsEsto({
  paraQue,
  comoSeCalcula,
}: {
  paraQue: React.ReactNode;
  comoSeCalcula: React.ReactNode;
}) {
  return (
    <details className="qee">
      <summary className="qee-sum">¿Qué es esto?</summary>
      <div className="qee-body">
        <p>
          <b>Para qué sirve.</b> {paraQue}
        </p>
        <p>
          <b>Cómo se hacen las cuentas.</b> {comoSeCalcula}
        </p>
      </div>
    </details>
  );
}

import * as React from "react";

/**
 * Traduce jerga financiera: muestra el término con un "?" y, al pasar el mouse
 * o con foco de teclado, una explicación en castellano llano.
 */
export function InfoTip({
  term,
  children,
}: {
  term: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="infotip" tabIndex={0}>
      {term}
      <span className="ii" aria-hidden="true">?</span>
      <span className="infotip-pop" role="tooltip">
        {children}
      </span>
    </span>
  );
}

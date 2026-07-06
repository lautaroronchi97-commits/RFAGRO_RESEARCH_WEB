import * as React from "react";

export function Panel({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" id={id}>
      {children}
    </section>
  );
}

export function PanelHead({
  glyph,
  title,
  sub,
  stamp,
}: {
  glyph?: React.ReactNode;
  title: string;
  sub?: string;
  stamp?: React.ReactNode;
}) {
  return (
    <div className="panel-hd">
      {glyph && <span className="ph-glyph">{glyph}</span>}
      <h2>{title}</h2>
      {sub && <span className="ph-sub">{sub}</span>}
      {stamp && (
        <span className="stamp">
          <span className="sdot" aria-hidden="true" />
          {stamp}
        </span>
      )}
    </div>
  );
}

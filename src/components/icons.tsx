import * as React from "react";

type P = React.SVGProps<SVGSVGElement>;

/** Espiga de trigo — marca principal (logo). */
export function WheatMark(props: P) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M8 15V4.4" />
      <path d="M8 4.6 6.4 2.7M8 4.6 9.6 2.7" />
      <path d="M8 6.2 5.3 4.4M8 6.2 10.7 4.4" />
      <path d="M8 8.4 5.3 6.6M8 8.4 10.7 6.6" />
      <path d="M8 10.6 5.3 8.8M8 10.6 10.7 8.8" />
    </svg>
  );
}

/** Vaina de soja. */
export function GlyphSoja(props: P) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true" {...props}>
      <path d="M3.2 9.2C3.2 6.6 5.3 5 8 5s4.8 1.6 4.8 4.2S10.7 12 8 12 3.2 11.8 3.2 9.2Z" />
      <circle cx="6" cy="8.6" r="1" />
      <circle cx="8.4" cy="9.1" r="1" />
      <circle cx="10.6" cy="8.6" r="1" />
    </svg>
  );
}

/** Choclo / maíz. */
export function GlyphMaiz(props: P) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true" {...props}>
      <rect x="5.4" y="2.8" width="5.2" height="10.4" rx="2.6" />
      <path d="M8 3.4V12.6M6.4 4.6l3.2 1M6.4 7l3.2 1M6.4 9.4l3.2 1" />
    </svg>
  );
}

/** Espiga de trigo (grupo). */
export function GlyphTrigo(props: P) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M8 14V5" />
      <path d="M8 5.2 6.6 3.4M8 5.2 9.4 3.4M8 7 6.1 5.4M8 7 9.9 5.4M8 8.8 6.1 7.2M8 8.8 9.9 7.2" />
    </svg>
  );
}

/** Glifo del módulo Arbitrajes (curva/línea). */
export function IconArb(props: P) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M2 11h3l2-5 3 8 2-4h2" />
    </svg>
  );
}

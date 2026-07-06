/**
 * Datos de EJEMPLO para el módulo Arbitrajes (Pizarra vs A3).
 * Se reemplazan por A3 Primary (futuros de granos) cuando carguemos las
 * credenciales de broker en variables de entorno. Números tomados del Excel
 * REAL_TIME del usuario.
 */

export type ArbRow = {
  pos: string;
  ultimo: number;
  comp: number;
  vend: number;
  ajuste: number;
  spread: number; // USD vs pizarra
  directa: number; // % en el período
  tna: number; // TNA USD %
  dias: number;
};

export type Grano = "Soja" | "Maíz" | "Trigo";

export type ArbGroup = {
  grano: Grano;
  pizarraUsd: number;
  pizarraArs?: number;
  rows: ArbRow[];
};

export const arbitrajes: ArbGroup[] = [
  {
    grano: "Soja",
    pizarraUsd: 312.9,
    pizarraArs: 460000,
    rows: [
      { pos: "SOJ.ROS/JUL26", ultimo: 327.2, comp: 327.0, vend: 327.2, ajuste: 327.4, spread: 14.27, directa: 4.56, tna: 45.0, dias: 37 },
      { pos: "SOJ.ROS/NOV26", ultimo: 336.2, comp: 336.1, vend: 336.2, ajuste: 337.0, spread: 23.27, directa: 7.44, tna: 17.1, dias: 159 },
    ],
  },
  {
    grano: "Maíz",
    pizarraUsd: 182.0,
    rows: [
      { pos: "MAI.ROS/JUL26", ultimo: 178.0, comp: 178.3, vend: 178.4, ajuste: 178.6, spread: -4.0, directa: -2.2, tna: -21.7, dias: 37 },
      { pos: "MAI.ROS/SEP26", ultimo: 180.7, comp: 180.6, vend: 180.8, ajuste: 181.5, spread: -1.3, directa: -0.71, tna: -2.7, dias: 98 },
      { pos: "MAI.ROS/DIC26", ultimo: 185.5, comp: 185.5, vend: 185.7, ajuste: 186.5, spread: 3.5, directa: 1.92, tna: 3.7, dias: 190 },
    ],
  },
  {
    grano: "Trigo",
    pizarraUsd: 207.0,
    rows: [
      { pos: "TRI.ROS/JUL26", ultimo: 205.0, comp: 204.5, vend: 205.4, ajuste: 206.2, spread: -2.0, directa: -0.97, tna: -9.5, dias: 37 },
      { pos: "TRI.ROS/DIC26", ultimo: 209.3, comp: 209.0, vend: 209.6, ajuste: 210.0, spread: 2.3, directa: 1.11, tna: 11.0, dias: 190 },
    ],
  },
];

/** Pases (spreads entre posiciones consecutivas). Ejemplo hasta conectar A3. */
export type PaseRow = { spread: string; comprador: number; ultimo: number; vendedor: number };
export type PaseGroup = { grano: Grano; rows: PaseRow[] };

export const pases: PaseGroup[] = [
  {
    grano: "Soja",
    rows: [
      { spread: "ENE26 / MAY26", comprador: 6.5, ultimo: 6.8, vendedor: 7.0 },
      { spread: "MAY26 / JUL26", comprador: 4.2, ultimo: 4.5, vendedor: 4.6 },
      { spread: "JUL26 / NOV26", comprador: 9.0, ultimo: 9.0, vendedor: 9.2 },
    ],
  },
  {
    grano: "Maíz",
    rows: [
      { spread: "JUL26 / SEP26", comprador: 2.3, ultimo: 2.4, vendedor: 2.5 },
      { spread: "SEP26 / DIC26", comprador: 4.8, ultimo: 4.9, vendedor: 5.0 },
      { spread: "JUL26 / DIC26", comprador: 7.2, ultimo: 7.9, vendedor: 7.4 },
    ],
  },
  {
    grano: "Trigo",
    rows: [
      { spread: "JUL26 / DIC26", comprador: 3.7, ultimo: 4.3, vendedor: 5.0 },
      { spread: "DIC26 / JUL27", comprador: 5.1, ultimo: 5.4, vendedor: 5.6 },
    ],
  },
];

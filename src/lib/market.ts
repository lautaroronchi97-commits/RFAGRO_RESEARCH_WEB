/**
 * Fachada de re-export de `src/lib/market/*` (partido en el lote L1, auditoría
 * E4 hallazgo #10 — este archivo era un monolito de 546 líneas con 8
 * responsabilidades mezcladas: HTTP genérico, fuentes crudas de terceros,
 * parsing de tickers, cinta, dólar futuro, dólar linked, volumen cambiario,
 * LECAPs). Mantiene el path "@/lib/market" y los nombres existentes para no
 * tocar los importadores actuales (server-only, como antes). `getMaeOficial`
 * NO se re-exporta acá: es de uso 100% interno entre los submódulos de
 * `market/`. Ver `docs/auditoria/E4-codigo.md` §A para el detalle de la
 * partición.
 */
import "server-only";

export type { Meta, FuenteStatus } from "./market/types";
export { getCintaData } from "./market/cinta";
export type { CintaData } from "./market/cinta";
export { getDolarFuturo } from "./market/dolar-futuro";
export { getDolarLinked } from "./market/dolar-linked";
export { getVolumenCambiario } from "./market/volumen";
export { getLecaps } from "./market/lecaps";

/**
 * Factores de conversión de commodities de Chicago a USD/tonelada. Compartido entre
 * `monitor-mercados.ts` (vista en vivo, `/granos`) y `scripts/ingest-cbot.mjs` (cron
 * de ingesta a `cbot_cierres`) — antes vivían como literales duplicados en los dos
 * lados; verificados idénticos en la auditoría E2, esto los deja compartidos de
 * verdad para que no puedan divergir en silencio.
 *
 * Sin `server-only` ni imports de Next a propósito: así también lo puede importar
 * el script `.mjs` con Node puro.
 */

/** ¢/bu → USD/tn de soja y trigo (peso legal del bushel: 60 lb). Fuente: U.S. Grains Council / CME. */
export const FACTOR_BU_SOJA_TRIGO = 0.3674371;

/** ¢/bu → USD/tn de maíz (peso legal del bushel: 56 lb). Fuente: U.S. Grains Council / CME. */
export const FACTOR_BU_MAIZ = 0.3936826;

/** USD/short-ton → USD/tn de harina de soja. Solo usado por el monitor (no se ingesta a la base). */
export const FACTOR_ST_HARINA = 1.1023113;

/** ¢/lb → USD/tn de aceite de soja. Solo usado por el monitor (no se ingesta a la base). */
export const FACTOR_LB_ACEITE = 22.046226;

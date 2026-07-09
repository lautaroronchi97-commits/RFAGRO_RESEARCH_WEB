import "server-only";
import { cache } from "react";
import { sbSelect } from "./supabase";

/**
 * Vencimientos (maturity) de los futuros de granos, leídos de Supabase
 * (tabla `vencimientos`, sembrada desde el CEM `GET /api/v2/symbols`). Se usan
 * para calcular los días al vencimiento → TNA de arbitrajes y pases.
 *
 * Devuelve un Map `symbol → 'YYYY-MM-DD'`. Si Supabase no está o la tabla está
 * vacía, devuelve un Map vacío y quien lo use degrada la TNA a `null`.
 */

type RawRow = { symbol: string; vencimiento: string };

export const getVencimientos = cache(async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  const res = await sbSelect("vencimientos?select=symbol,vencimiento", 86_400);
  if (!res.ok || !Array.isArray(res.data)) return map;
  for (const r of res.data as RawRow[]) {
    if (r?.symbol && r?.vencimiento) map.set(r.symbol, r.vencimiento);
  }
  return map;
});

// Edge Function: dea-fetch
// -----------------------------------------------------------------------------
// Proxy del CSV oficial de la DEA (SAGyP). `datosestimaciones.magyp.gob.ar`
// filtra las IPs de GitHub Actions (ConnectTimeout 4/4 desde el 16/07 —
// auditoría E5, hallazgo #8); desde sa-east-1 (São Paulo) responde. Es el mismo
// remedio que ya salvó a lineup/ISA. La función SOLO baja y devuelve el CSV: el
// parse y el upsert siguen en scripts/ingest-dea.mjs (que ahora la invoca).
//
// Auth: verify_jwt del gateway + comparación del bearer contra la service key
// (la anon key pública no puede gatillar el fetch).
// -----------------------------------------------------------------------------

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL_DEA = "https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer || bearer !== SVC) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const res = await fetch(URL_DEA, {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 (RFAGRO research)",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "Dataset=Dataset",
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      return Response.json({ ok: false, error: `dea_http_${res.status}` }, { status: 502 });
    }
    // Pass-through en streaming (el CSV pesa ~11,5 MB; latin-1 lo decodifica el script).
    return new Response(res.body, {
      status: 200,
      headers: { "content-type": "text/csv" },
    });
  } catch (e) {
    return Response.json({ ok: false, error: "fetch_failed", detail: String(e) }, { status: 502 });
  }
});

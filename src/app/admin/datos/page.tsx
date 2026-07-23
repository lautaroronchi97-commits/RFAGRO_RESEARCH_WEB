import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { hoyCordobaISO } from "@/lib/dates";
import { Uploader } from "./uploader";
import { PromptAgrochat } from "./prompt-agrochat";
import { UploaderCamiones } from "./uploader-camiones";
import { PromptCamiones } from "./prompt-camiones";
import { DatosDia } from "./datos-dia";
import { DeaUploader } from "./dea-uploader";
import { PasUploader } from "./pas-uploader";

/**
 * Pestaña DATOS del panel admin: actualizar series que se cargan a mano (sin cron), subiendo
 * exports de Agrochat/Williams — comercialización de granos (tabla `compras`), camiones en
 * puerto (tabla `camiones`, Williams Entregas), "datos del día" del informe diario (MP1: color
 * de la rueda + compras BCRA), y estimaciones DEA-SAGyP + BCBA-PAS (lotes L5/A3 — fuentes
 * bloqueadas por IP/Cloudflare). Protegida como las páginas hermanas: requireAdmin acá mismo
 * (además del layout), y cada server action vuelve a exigir admin en su primera línea; la
 * escritura va por RPC con guard is_admin() (sin service key en la web).
 */
export default async function DatosPage() {
  await requireAdmin();

  const fechaHoy = hoyCordobaISO();
  const supabase = await createSupabaseServerClient();
  const [{ data: colorRows }, { data: bcraRow }] = await Promise.all([
    supabase.from("mesa_color").select("fecha,texto").order("fecha", { ascending: false }).limit(6),
    supabase.from("compras_bcra").select("monto_musd").eq("fecha", fechaHoy).maybeSingle(),
  ]);
  const filas = (colorRows ?? []) as { fecha: string; texto: string }[];
  const deHoy = filas.find((f) => f.fecha === fechaHoy);
  const recientes = filas.filter((f) => f.fecha !== fechaHoy).slice(0, 3);
  const bcraHoy = (bcraRow as { monto_musd: number } | null)?.monto_musd ?? null;

  return (
    <section>
      <div className="admin-hd">
        <h1 className="admin-h1">Datos · Serie de comercialización</h1>
        <p className="admin-sub">
          Subí el export semanal de Agrochat (compras por grano, sector y campaña, en toneladas) para
          actualizar la serie que alimenta <Link href="/comercio/negociado">Negociado por producto</Link> y
          el índice de <Link href="/comercio/temperatura">Calor de mercadería</Link>. Primero previsualizá
          (no escribe nada), después confirmá la carga.
        </p>
      </div>
      <PromptAgrochat />
      <Uploader />

      <div className="admin-hd" style={{ marginTop: 32 }}>
        <h2 className="admin-h1" style={{ fontSize: "1.3rem" }}>Datos · Camiones en puerto</h2>
        <p className="admin-sub">
          Subí el export de Williams Entregas (vía Agrochat) para actualizar{" "}
          <Link href="/comercio/camiones">Camiones en puerto</Link> — es SIEMPRE carga manual (Williams no
          tiene API pública). Un archivo por serie: el total sin filtrar, o un grano puntual (Agrochat no
          banca los 3 juntos por tamaño). Elegí la serie, previsualizá y confirmá.
        </p>
      </div>
      <PromptCamiones />
      <UploaderCamiones />

      <DatosDia fechaHoy={fechaHoy} colorHoy={deHoy?.texto ?? ""} bcraHoy={bcraHoy} recientes={recientes} />
      <DeaUploader hoy={fechaHoy} />
      <PasUploader hoy={fechaHoy} />
    </section>
  );
}

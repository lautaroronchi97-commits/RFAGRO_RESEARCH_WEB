import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { hoyCordobaISO } from "@/lib/dates";
import { Uploader } from "./uploader";
import { PromptAgrochat } from "./prompt-agrochat";
import { MesaColor } from "./mesa-color";

/**
 * Pestaña DATOS del panel admin: actualizar la serie semanal de comercialización de
 * granos (tabla `compras`, base SIO Granos) subiendo el export de Agrochat, y cargar el
 * "color de la rueda" del informe diario (MP1 de PLAN_INFORMES.md). Protegida como las
 * páginas hermanas: requireAdmin acá mismo (además del layout), y cada server action
 * vuelve a exigir admin en su primera línea; la escritura va por RPC con guard is_admin().
 */
export default async function DatosPage() {
  await requireAdmin();

  const fechaHoy = hoyCordobaISO();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("mesa_color")
    .select("fecha,texto")
    .order("fecha", { ascending: false })
    .limit(6);
  const filas = (data ?? []) as { fecha: string; texto: string }[];
  const deHoy = filas.find((f) => f.fecha === fechaHoy);
  const recientes = filas.filter((f) => f.fecha !== fechaHoy).slice(0, 3);

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
      <MesaColor fechaHoy={fechaHoy} actualHoy={deHoy?.texto ?? ""} recientes={recientes} />
    </section>
  );
}

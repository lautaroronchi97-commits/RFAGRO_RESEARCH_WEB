import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { Uploader } from "./uploader";

/**
 * Pestaña DATOS del panel admin: actualizar la serie semanal de comercialización de
 * granos (tabla `compras`, base SIO Granos) subiendo el export de Agrochat. Protegida
 * como las páginas hermanas: requireAdmin acá mismo (además del layout), y cada server
 * action vuelve a exigir admin en su primera línea; la escritura va por RPC con guard
 * is_admin().
 */
export default async function DatosPage() {
  await requireAdmin();
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
      <Uploader />
    </section>
  );
}

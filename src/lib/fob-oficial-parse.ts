/** Parsing puro (testeable) de la respuesta de la API de FOB oficial de SAGyP/MAGyP. */

export type PostFob = {
  fecha: string;
  circular: string;
  posicion: string;
  precio: number;
  mesDesde: number;
  añoDesde: number;
  mesHasta: number;
  añoHasta: number;
};

/**
 * Entre todas las ventanas de embarque publicadas para una posición en el día, la fila "spot"
 * es la de inicio (mesDesde/añoDesde) más cercano — la ventana de embarque en curso.
 */
export function filaSpot(posts: PostFob[], posicion: string): PostFob | null {
  const filas = posts.filter((p) => p.posicion === posicion);
  if (filas.length === 0) return null;
  return filas.reduce((min, p) => {
    const keyP = p.añoDesde * 12 + p.mesDesde;
    const keyMin = min.añoDesde * 12 + min.mesDesde;
    return keyP < keyMin ? p : min;
  });
}

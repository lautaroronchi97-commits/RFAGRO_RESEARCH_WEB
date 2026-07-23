/**
 * Renderer de markdown MUY simple (párrafos separados por línea en blanco +
 * `**negrita**`) — el mismo formato que ya usa `/granos/view` para la tesis del
 * view de mercado. Reusado acá para las interpretaciones de informes (MP4).
 */
export function MdLite({ md, className }: { md: string; className?: string }) {
  const parrafos = md
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {parrafos.map((p, i) => (
        <p key={i}>
          {p.split(/\*\*(.+?)\*\*/g).map((seg, j) => (j % 2 === 1 ? <strong key={j}>{seg}</strong> : seg))}
        </p>
      ))}
    </div>
  );
}

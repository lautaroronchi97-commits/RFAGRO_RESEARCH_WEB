import { WheatMark } from "./icons";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-brand" aria-hidden="true">
        <WheatMark />
        <span className="fb-name">
          <span className="rf">RF</span> <span className="agro">AGRO</span>
        </span>
        <span className="fb-sub">Research de granos</span>
      </div>
      <div className="src">
        <b>RF AGRO</b>
        <span className="src-chip">Elaboración propia · datos de mercado</span>
      </div>
      <span className="maqueta">
        <span className="k">v0</span> datos de cierre · algunos provisorios
      </span>
      <p className="disc">
        Información de mercado con fines informativos. No constituye recomendación ni
        asesoramiento de inversión. Las decisiones y su resultado son responsabilidad del usuario.
      </p>
    </footer>
  );
}

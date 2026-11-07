import { useDatos } from '../hooks/useInvitee';
import { fechaPartes, horaTexto } from '../utils/formato';
import { lineasCargo, nombreCompleto } from '../utils/redaccion';
import { Curves } from './Curves';
import { HeaderInstitutional } from './HeaderInstitutional';
import { Ornament } from './Ornament';

/** Línea de titular que emerge desde una máscara. */
const Linea = ({ children, i }: { children: React.ReactNode; i: number }) => (
  <span className="mask" style={{ '--i': i } as React.CSSProperties}>
    <span className="mask__inner">{children}</span>
  </span>
);

export function HeroInvitation() {
  const { evento, invitado } = useDatos();
  const f = fechaPartes(evento.fecha);
  const inst = evento.institucion;
  return (
    <section className="hero" id="inicio" aria-labelledby="titulo-evento">
      <div className="hero__frame" aria-hidden="true" />
      <div className="hero__inner">
        <HeaderInstitutional />

        <p className="hero__inst">
          <span>{inst.universidad}</span>
          <span>{inst.centro}</span>
          <span>{inst.division}</span>
          <span>{inst.area}</span>
        </p>

        <Ornament className="hero__ornament" />

        <p className="eyebrow eyebrow--gold hero__eyebrow">Invitación</p>
        <h1 className="hero__title" id="titulo-evento">
          <Linea i={0}>Presentación de Seminario</Linea>
          <Linea i={1}>
            <em>y Cierre de Maestría</em>
          </Linea>
        </h1>
        <p className="hero__program">
          Maestría en Marketing Estratégico
          <br />y Alta Gerencia
        </p>

        <p className="hero__when">
          <time dateTime={`${evento.fecha}T${evento.horaInicio}${evento.offsetUtc}`}>
            {f.diaSemana} {f.sinAnio} · {horaTexto(evento.horaInicio)}
          </time>
          <span aria-hidden="true"> · </span>
          {evento.ciudad}
        </p>

        {invitado && (
          <div className="hero__guest">
            <p className="eyebrow">Especialmente para</p>
            <p className="hero__name">{nombreCompleto(invitado)}</p>
            {lineasCargo(invitado).map((l) => (
              <p key={l} className="hero__role">
                {l}
              </p>
            ))}
          </div>
        )}

        <a className="hero__cue" href="#informacion">
          <span>Descubrir</span>
          <span className="hero__cue-line" aria-hidden="true" />
        </a>
      </div>
      <Curves className="curves--hero" />
    </section>
  );
}

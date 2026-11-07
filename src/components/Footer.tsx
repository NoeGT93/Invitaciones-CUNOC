import { useDatos } from '../hooks/useInvitee';
import { fechaPartes } from '../utils/formato';
import { Curves } from './Curves';
import { Ornament } from './Ornament';

export function Footer() {
  const { evento, maestrante } = useDatos();
  const [entidad, ...resto] = evento.firma;
  const f = fechaPartes(evento.fecha);
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__closing" data-reveal>
          {evento.mensaje.cierre}
        </p>
        <div data-reveal>
          <Ornament />
        </div>
        <div className="footer__sign" data-reveal>
          <p className="footer__entity">{entidad}</p>
          {resto.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>

        {maestrante && (
          <p className="footer__from" data-reveal>
            Invitación extendida por {maestrante.nombre}
            {maestrante.grupo ? `, maestrante del Grupo No. ${maestrante.grupo}` : ''}
          </p>
        )}

        <p className="footer__date" aria-label={f.larga} data-reveal>
          {f.numerica.split(' · ').map((n, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>
              {i > 0 && <span className="footer__dot">·</span>}
              {n}
            </span>
          ))}
        </p>
      </div>
      <Curves className="curves--footer" />
    </footer>
  );
}

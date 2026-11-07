import { evento, mensaje } from '../data/evento';
import type { Maestrante } from '../data/maestrantes';
import { fechaPartes } from '../utils/formato';
import { Curves } from './Curves';

export function Footer({ maestrante }: { maestrante?: Maestrante }) {
  const [entidad, ...resto] = evento.firma;
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__closing" data-reveal>
          {mensaje.cierre}
        </p>
        <span className="rule rule--gold" aria-hidden="true" />
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

        <p className="footer__date" aria-label={fechaPartes(evento.fecha).larga}>
          {fechaPartes(evento.fecha).numerica}
        </p>
      </div>
      <Curves className="curves--footer" />
    </footer>
  );
}

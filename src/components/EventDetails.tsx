import { evento } from '../data/evento';
import { fechaPartes, horaTexto } from '../utils/formato';
import { RSVPButton } from './RSVPButton';

export function EventDetails() {
  const f = fechaPartes(evento.fecha);
  return (
    <div className="details" data-reveal>
      <dl className="details__grid">
        <div className="details__item">
          <dt>Fecha</dt>
          <dd>
            <span className="details__minor">{f.diaSemana}</span>
            <span className="details__major">{f.larga}</span>
          </dd>
        </div>
        <div className="details__item">
          <dt>Hora</dt>
          <dd>
            <span className="details__major">{horaTexto(evento.horaInicio)}</span>
            {evento.horaFin && <span className="details__minor">a {horaTexto(evento.horaFin)}</span>}
          </dd>
        </div>
        <div className="details__item">
          <dt>Lugar</dt>
          <dd>
            <span className="details__major">{evento.lugar}</span>
            <span className="details__minor">{[evento.direccion, evento.ciudad].filter(Boolean).join(', ')}</span>
          </dd>
        </div>
      </dl>

      <div className="actions">
        <a className="btn btn--primary" href="#programa">
          Ver programa
          <span className="btn__arrow" aria-hidden="true">↓</span>
        </a>
        <a className="btn btn--ghost" href="/evento.ics" download="cierre-maestria-cunoc.ics">
          Agregar al calendario
        </a>
        {evento.mapsUrl && (
          <a className="link" href={evento.mapsUrl} target="_blank" rel="noopener noreferrer">
            Cómo llegar
            <span className="link__arrow" aria-hidden="true">→</span>
            <span className="sr-only"> (abre Google Maps en una pestaña nueva)</span>
          </a>
        )}
        <RSVPButton />
      </div>
    </div>
  );
}

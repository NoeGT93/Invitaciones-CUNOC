import { evento } from '../data/evento';

/** Solo se muestra si `evento.rsvp` está configurado en src/data/evento.ts. */
export function RSVPButton() {
  if (!evento.rsvp) return null;
  return (
    <a className="link" href={evento.rsvp.url} target="_blank" rel="noopener noreferrer">
      {evento.rsvp.etiqueta}
      <span className="link__arrow" aria-hidden="true">→</span>
    </a>
  );
}

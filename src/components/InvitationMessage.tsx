import { mensaje } from '../data/evento';
import type { Invitado } from '../data/invitados';
import { apertura, nombreCompleto } from '../utils/redaccion';

export function InvitationMessage({ invitado }: { invitado?: Invitado }) {
  return (
    <div className="message" data-reveal>
      {invitado && <p className="message__salute">{nombreCompleto(invitado)}:</p>}
      <p className="message__lead">{apertura(invitado)}</p>
      {mensaje.cuerpo.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

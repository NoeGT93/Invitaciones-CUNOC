import { useDatos } from '../hooks/useInvitee';
import { apertura, nombreCompleto } from '../utils/redaccion';

export function InvitationMessage() {
  const { evento, invitado } = useDatos();
  return (
    <div className="message" data-reveal>
      {invitado && <p className="message__salute">{nombreCompleto(invitado)}:</p>}
      <p className="message__lead">{apertura(evento.mensaje, invitado)}</p>
      {evento.mensaje.cuerpo.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

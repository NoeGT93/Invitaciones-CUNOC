import { useState } from 'react';
import type { EstadoRsvp } from '../data/tipos';
import { useDatos } from '../hooks/useInvitee';
import { fechaPartes } from '../utils/formato';
import { Ornament } from './Ornament';

/**
 * Confirmación de asistencia. Solo aparece en invitaciones personalizadas
 * y si está activa en /admin → Evento. El estado se ve en el panel.
 */
export function RSVP({ onCambio }: { onCambio: (estado: EstadoRsvp, nota: string | null) => void }) {
  const { evento, invitado } = useDatos();
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState(invitado?.nota ?? '');
  const [enviando, setEnviando] = useState<EstadoRsvp | null>(null);
  const [error, setError] = useState('');

  if (!invitado || !evento.rsvpActivo) return null;
  const respondido = invitado.estado !== 'pendiente' && !editando;

  async function responder(estado: EstadoRsvp) {
    setEnviando(estado);
    setError('');
    try {
      const r = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: invitado!.slug, estado, nota: nota.trim() || null }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? 'No fue posible registrar su respuesta.');
      onCambio(estado, nota.trim() || null);
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible registrar su respuesta.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section className="rsvp" id="confirmacion" aria-labelledby="titulo-rsvp" data-reveal>
      <Ornament />
      <p className="eyebrow eyebrow--gold">Confirmación de asistencia</p>

      {respondido ? (
        <div className="rsvp__done" role="status" key={invitado.estado}>
          <h2 id="titulo-rsvp" className="rsvp__title">
            {invitado.estado === 'confirmado' ? 'Gracias por confirmar su asistencia.' : 'Lamentamos que no pueda acompañarnos.'}
          </h2>
          <p className="rsvp__text">
            {invitado.estado === 'confirmado'
              ? 'Será un privilegio recibirle el día del evento.'
              : 'Agradecemos sinceramente su respuesta y su aprecio por este momento.'}
          </p>
          <button type="button" className="link" onClick={() => setEditando(true)}>
            Modificar respuesta
          </button>
        </div>
      ) : (
        <div className="rsvp__form">
          <h2 id="titulo-rsvp" className="rsvp__title">¿Nos acompañará?</h2>
          {evento.rsvpFechaLimite && (
            <p className="rsvp__text">Agradeceremos su respuesta antes del {fechaPartes(evento.rsvpFechaLimite).sinAnio}.</p>
          )}
          <label className="rsvp__note">
            <span>Comentario (opcional)</span>
            <textarea rows={2} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
          </label>
          <div className="rsvp__actions">
            <button type="button" className="btn btn--primary" disabled={!!enviando} onClick={() => responder('confirmado')}>
              <span>{enviando === 'confirmado' ? 'Registrando…' : 'Confirmo mi asistencia'}</span>
            </button>
            <button type="button" className="btn btn--ghost" disabled={!!enviando} onClick={() => responder('declinado')}>
              <span>{enviando === 'declinado' ? 'Registrando…' : 'No podré asistir'}</span>
            </button>
          </div>
          {error && (
            <p className="rsvp__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

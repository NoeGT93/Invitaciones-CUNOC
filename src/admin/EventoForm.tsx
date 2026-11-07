import { useEffect, useState, type FormEvent } from 'react';
import type { Evento } from '../data/evento';
import { api } from './api';

export function EventoForm({ onError }: { onError: (e: unknown) => void }) {
  const [ev, setEv] = useState<Evento | null>(null);
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Evento>('evento')
      .then(setEv)
      .catch((e) => (onError(e), setError(e.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ev) return <p className="adm-muted">{error || 'Cargando…'}</p>;

  const set = <K extends keyof Evento>(k: K, v: Evento[K]) => (setEv({ ...ev, [k]: v }), setEstado(''));
  const setMsg = (k: keyof Evento['mensaje'], v: string | string[]) => set('mensaje', { ...ev.mensaje, [k]: v });
  const texto = (k: 'lugar' | 'ciudad' | 'direccion' | 'mapsUrl') => ({
    value: ev[k] ?? '',
    onChange: (e: { target: { value: string } }) => set(k, e.target.value),
  });

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setEstado('guardando');
    setError('');
    try {
      const { fecha, horaInicio, horaFin, lugar, ciudad, direccion, mapsUrl, rsvpActivo, entradasActivas, rsvpFechaLimite, mensaje } = ev!;
      setEv(
        await api<Evento>('evento', {
          method: 'PUT',
          body: { fecha, horaInicio, horaFin: horaFin || '', lugar, ciudad, direccion, mapsUrl, rsvpActivo, entradasActivas, rsvpFechaLimite: rsvpFechaLimite || '', mensaje },
        }),
      );
      setEstado('ok');
    } catch (err) {
      onError(err);
      setEstado('');
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  return (
    <section aria-labelledby="t-evento">
      <div className="adm-head">
        <div>
          <h1 id="t-evento">Evento</h1>
          <p className="adm-muted">Los cambios se reflejan de inmediato en todas las invitaciones y en el archivo de calendario.</p>
        </div>
      </div>

      <form className="adm-form" onSubmit={guardar}>
        <fieldset className="adm-card">
          <legend>Fecha, hora y lugar</legend>
          <div className="adm-grid">
            <label className="adm-field">
              <span>Fecha</span>
              <input type="date" required value={ev.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Hora de inicio</span>
              <input type="time" required value={ev.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Hora de finalización (opcional)</span>
              <input type="time" value={ev.horaFin ?? ''} onChange={(e) => set('horaFin', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Lugar</span>
              <input required maxLength={120} {...texto('lugar')} />
            </label>
            <label className="adm-field">
              <span>Ciudad</span>
              <input required maxLength={120} {...texto('ciudad')} />
            </label>
            <label className="adm-field">
              <span>Dirección (opcional)</span>
              <input maxLength={200} {...texto('direccion')} />
            </label>
            <label className="adm-field adm-field--full">
              <span>Enlace de Google Maps (opcional — activa «Cómo llegar»)</span>
              <input type="url" placeholder="https://maps.app.goo.gl/…" maxLength={500} {...texto('mapsUrl')} />
            </label>
          </div>
        </fieldset>

        <fieldset className="adm-card">
          <legend>Confirmación de asistencia</legend>
          <div className="adm-grid">
            <label className="adm-check adm-field--full">
              <input type="checkbox" checked={ev.rsvpActivo} onChange={(e) => set('rsvpActivo', e.target.checked)} />
              <span>Permitir que los invitados confirmen desde su enlace</span>
            </label>
            <label className="adm-check adm-field--full">
              <input type="checkbox" checked={ev.entradasActivas} onChange={(e) => set('entradasActivas', e.target.checked)} />
              <span>Mostrar a los maestrantes el apartado para descargar sus entradas QR</span>
            </label>
            <label className="adm-field">
              <span>Fecha sugerida para responder (opcional)</span>
              <input type="date" value={ev.rsvpFechaLimite ?? ''} onChange={(e) => set('rsvpFechaLimite', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="adm-card">
          <legend>Textos de la invitación</legend>
          <div className="adm-grid">
            <label className="adm-field adm-field--full">
              <span>Primer párrafo (invitación general, sin nombre)</span>
              <textarea rows={3} required maxLength={600} value={ev.mensaje.aperturaGeneral} onChange={(e) => setMsg('aperturaGeneral', e.target.value)} />
            </label>
            {ev.mensaje.cuerpo.map((p, i) => (
              <label key={i} className="adm-field adm-field--full">
                <span>Párrafo {i + 2}</span>
                <textarea
                  rows={2}
                  required
                  maxLength={600}
                  value={p}
                  onChange={(e) => setMsg('cuerpo', ev.mensaje.cuerpo.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </label>
            ))}
            <label className="adm-field adm-field--full">
              <span>Frase de cierre</span>
              <input required maxLength={160} value={ev.mensaje.cierre} onChange={(e) => setMsg('cierre', e.target.value)} />
            </label>
          </div>
        </fieldset>

        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="adm-form__actions adm-form__actions--sticky">
          {estado === 'ok' && <span className="adm-ok" role="status">Cambios guardados ✓</span>}
          <button className="adm-btn adm-btn--primary" disabled={estado === 'guardando'}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  );
}

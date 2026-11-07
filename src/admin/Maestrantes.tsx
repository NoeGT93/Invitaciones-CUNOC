import { useEffect, useState, type FormEvent } from 'react';
import type { Maestrante } from '../data/tipos';
import { api } from './api';

export function Maestrantes({ onError }: { onError: (e: unknown) => void }) {
  const [lista, setLista] = useState<Maestrante[] | null>(null);
  const [borrador, setBorrador] = useState<Partial<Maestrante>>({ nombre: '', grupo: null });
  const [error, setError] = useState('');

  const cargar = () =>
    api<Maestrante[]>('maestrantes')
      .then(setLista)
      .catch((e) => (onError(e), setError(e.message)));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api(borrador.id ? `maestrantes/${borrador.id}` : 'maestrantes', { method: borrador.id ? 'PUT' : 'POST', body: borrador });
      setBorrador({ nombre: '', grupo: null });
      await cargar();
    } catch (err) {
      onError(err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function eliminar(m: Maestrante) {
    if (!confirm(`¿Eliminar a ${m.nombre}? Sus invitados quedarán a nombre de la Junta Directiva.`)) return;
    await api(`maestrantes/${m.id}`, { method: 'DELETE' }).catch(onError);
    cargar();
  }

  return (
    <section aria-labelledby="t-maestrantes">
      <div className="adm-head">
        <div>
          <h1 id="t-maestrantes">Maestrantes</h1>
          <p className="adm-muted">Quien extiende la invitación. Se muestra discretamente al pie de cada invitación asignada.</p>
        </div>
      </div>

      <form className="adm-form adm-card adm-inline" onSubmit={guardar}>
        <label className="adm-field adm-field--lg">
          <span>{borrador.id ? 'Editar nombre' : 'Nombre completo'}</span>
          <input required maxLength={120} value={borrador.nombre ?? ''} onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))} />
        </label>
        <label className="adm-field adm-field--sm">
          <span>Grupo</span>
          <input
            type="number"
            min={1}
            max={99}
            value={borrador.grupo ?? ''}
            onChange={(e) => setBorrador((b) => ({ ...b, grupo: e.target.value ? Number(e.target.value) : null }))}
          />
        </label>
        <div className="adm-form__actions">
          {borrador.id && (
            <button type="button" className="adm-btn" onClick={() => setBorrador({ nombre: '', grupo: null })}>
              Cancelar
            </button>
          )}
          <button className="adm-btn adm-btn--primary">{borrador.id ? 'Guardar' : 'Agregar'}</button>
        </div>
      </form>
      {error && <p className="adm-error" role="alert">{error}</p>}

      {lista === null ? (
        <p className="adm-muted">Cargando…</p>
      ) : !lista.length ? (
        <p className="adm-empty">Aún no hay maestrantes registrados.</p>
      ) : (
        <ul className="adm-list">
          {lista.map((m) => (
            <li key={m.id} className="adm-item adm-item--compact">
              <div className="adm-item__who">
                <strong>{m.nombre}</strong>
                <span className="adm-muted">{m.grupo ? `Grupo No. ${m.grupo}` : 'Sin grupo'}</span>
              </div>
              <div className="adm-row-actions">
                <button className="adm-chip" onClick={() => setBorrador(m)}>
                  Editar
                </button>
                <button className="adm-chip adm-chip--danger" onClick={() => eliminar(m)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

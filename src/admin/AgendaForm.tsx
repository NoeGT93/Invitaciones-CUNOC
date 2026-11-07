import { useEffect, useState } from 'react';
import type { BloqueAgenda, ItemAgenda } from '../data/agenda';
import { ICONOS, Icono, iconoDe } from '../components/Icono';
import { api } from './api';

const mover = <T,>(arr: T[], i: number, dir: -1 | 1) => {
  const r = [...arr];
  [r[i], r[i + dir]] = [r[i + dir], r[i]];
  return r;
};

function Hora({ valor, onChange, etiqueta }: { valor?: { inicio: string; fin?: string }; onChange: (h?: { inicio: string; fin?: string }) => void; etiqueta: string }) {
  return (
    <div className="adm-hours" role="group" aria-label={etiqueta}>
      <input type="time" aria-label="Inicio" value={valor?.inicio ?? ''} onChange={(e) => onChange(e.target.value ? { inicio: e.target.value, fin: valor?.fin } : undefined)} />
      <span aria-hidden="true">–</span>
      <input type="time" aria-label="Fin" value={valor?.fin ?? ''} disabled={!valor?.inicio} onChange={(e) => onChange({ inicio: valor!.inicio, fin: e.target.value || undefined })} />
    </div>
  );
}

function Punto({
  item,
  onChange,
  onQuitar,
  onMover,
  primero,
  ultimo,
}: {
  item: ItemAgenda;
  onChange: (i: ItemAgenda) => void;
  onQuitar: () => void;
  onMover: (d: -1 | 1) => void;
  primero: boolean;
  ultimo: boolean;
}) {
  const set = (p: Partial<ItemAgenda>) => onChange({ ...item, ...p });
  const part = item.participaciones ?? [];
  const sub = item.subitems ?? [];
  return (
    <li className="adm-point">
      <div className="adm-point__main">
        <Hora valor={item.hora} etiqueta="Horario" onChange={(hora) => set({ hora })} />
        <input className="adm-point__title" required maxLength={160} placeholder="Actividad" value={item.titulo} onChange={(e) => set({ titulo: e.target.value })} aria-label="Actividad" />
        <label className="adm-icon-pick" title="Ícono">
          {iconoDe(item.titulo, item.icono) ? <Icono nombre={iconoDe(item.titulo, item.icono)!} /> : <span className="adm-icon-none">—</span>}
          <select aria-label="Ícono" value={item.icono ?? ''} onChange={(e) => set({ icono: e.target.value || undefined })}>
            <option value="">Automático</option>
            <option value="ninguno">Sin ícono</option>
            {ICONOS.map((ic) => (
              <option key={ic.id} value={ic.id}>
                {ic.nombre}
              </option>
            ))}
          </select>
        </label>
        <input maxLength={160} placeholder="Responsable (opcional)" value={item.responsable ?? ''} onChange={(e) => set({ responsable: e.target.value || undefined })} aria-label="Responsable" />
        <div className="adm-row-actions">
          <button type="button" className="adm-chip" disabled={primero} onClick={() => onMover(-1)} aria-label="Subir">
            ↑
          </button>
          <button type="button" className="adm-chip" disabled={ultimo} onClick={() => onMover(1)} aria-label="Bajar">
            ↓
          </button>
          <button type="button" className="adm-chip adm-chip--danger" onClick={onQuitar} aria-label={`Quitar ${item.titulo || 'punto'}`}>
            Quitar
          </button>
        </div>
      </div>

      {part.length > 0 && (
        <ul className="adm-sub">
          {part.map((p, i) => (
            <li key={i}>
              <input required maxLength={120} placeholder="Participante" value={p.nombre} onChange={(e) => set({ participaciones: part.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)) })} />
              <input maxLength={160} placeholder="Tema" value={p.tema} onChange={(e) => set({ participaciones: part.map((x, j) => (j === i ? { ...x, tema: e.target.value } : x)) })} />
              <button type="button" className="adm-chip adm-chip--danger" onClick={() => set({ participaciones: part.filter((_, j) => j !== i) })} aria-label="Quitar participante">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {sub.length > 0 && (
        <ul className="adm-sub">
          {sub.map((s, i) => (
            <li key={i}>
              <input required maxLength={120} placeholder="Subpunto (p. ej. Grupo No. 1)" value={s.titulo} onChange={(e) => set({ subitems: sub.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
              <Hora valor={s.hora} etiqueta="Horario del subpunto" onChange={(hora) => set({ subitems: sub.map((x, j) => (j === i ? { ...x, hora } : x)) })} />
              <button type="button" className="adm-chip adm-chip--danger" onClick={() => set({ subitems: sub.filter((_, j) => j !== i) })} aria-label="Quitar subpunto">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="adm-point__more">
        <button type="button" className="adm-link-btn" onClick={() => set({ participaciones: [...part, { nombre: '', tema: '' }] })}>
          + Participante
        </button>
        <button type="button" className="adm-link-btn" onClick={() => set({ subitems: [...sub, { titulo: '' }] })}>
          + Subpunto con horario
        </button>
      </div>
    </li>
  );
}

export function AgendaForm({ onError }: { onError: (e: unknown) => void }) {
  const [agenda, setAgenda] = useState<BloqueAgenda[] | null>(null);
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | 'cambios'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<BloqueAgenda[]>('agenda').then(setAgenda).catch((e) => (onError(e), setError(e.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!agenda) return <p className="adm-muted">{error || 'Cargando…'}</p>;

  const cambiar = (a: BloqueAgenda[]) => (setAgenda(a), setEstado('cambios'));
  const setBloque = (i: number, b: Partial<BloqueAgenda>) => cambiar(agenda.map((x, j) => (j === i ? { ...x, ...b } : x)));

  async function guardar() {
    setEstado('guardando');
    setError('');
    try {
      setAgenda(await api<BloqueAgenda[]>('agenda', { method: 'PUT', body: { agenda } }));
      setEstado('ok');
    } catch (err) {
      onError(err);
      setEstado('cambios');
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function restaurar() {
    if (!confirm('¿Restaurar la agenda original? Se perderán los cambios hechos desde el panel.')) return;
    setAgenda(await api<BloqueAgenda[]>('agenda', { method: 'DELETE' }));
    setEstado('ok');
  }

  return (
    <section aria-labelledby="t-agenda">
      <div className="adm-head">
        <div>
          <h1 id="t-agenda">Agenda</h1>
          <p className="adm-muted">
            Edite, agregue, quite u ordene los puntos del programa. El horario es opcional: un punto sin hora se muestra en la secuencia sin
            asignarle una. La primera sección es el acto académico; las siguientes se muestran con estilo de cierre.
          </p>
        </div>
        <div className="adm-head__actions">
          <button className="adm-btn" onClick={restaurar}>
            Restaurar original
          </button>
        </div>
      </div>

      {agenda.map((b, bi) => (
        <fieldset key={bi} className="adm-card adm-block">
          <legend>Sección {bi + 1}</legend>
          <div className="adm-grid">
            <label className="adm-field">
              <span>Título</span>
              <input required maxLength={80} value={b.titulo} onChange={(e) => setBloque(bi, { titulo: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Leyenda (opcional)</span>
              <input maxLength={120} placeholder="Al finalizar el acto académico" value={b.leyenda ?? ''} onChange={(e) => setBloque(bi, { leyenda: e.target.value || undefined })} />
            </label>
          </div>
          <ol className="adm-points">
            {b.items.map((it, ii) => (
              <Punto
                key={ii}
                item={it}
                primero={ii === 0}
                ultimo={ii === b.items.length - 1}
                onChange={(n) => setBloque(bi, { items: b.items.map((x, j) => (j === ii ? n : x)) })}
                onQuitar={() => setBloque(bi, { items: b.items.filter((_, j) => j !== ii) })}
                onMover={(d) => setBloque(bi, { items: mover(b.items, ii, d) })}
              />
            ))}
          </ol>
          <div className="adm-form__actions adm-form__actions--start">
            <button type="button" className="adm-btn" onClick={() => setBloque(bi, { items: [...b.items, { titulo: '' }] })}>
              + Agregar punto
            </button>
            {agenda.length > 1 && (
              <button
                type="button"
                className="adm-btn adm-btn--danger"
                onClick={() => confirm(`¿Quitar la sección «${b.titulo}» completa?`) && cambiar(agenda.filter((_, j) => j !== bi))}
              >
                Quitar sección
              </button>
            )}
          </div>
        </fieldset>
      ))}

      <button type="button" className="adm-btn" onClick={() => cambiar([...agenda, { id: `seccion-${agenda.length + 1}`, titulo: 'Nueva sección', items: [] }])} disabled={agenda.length >= 6}>
        + Agregar sección
      </button>

      {error && <p className="adm-error" role="alert">{error}</p>}
      <div className="adm-form__actions adm-form__actions--sticky">
        {estado === 'ok' && <span className="adm-ok" role="status">Agenda publicada ✓</span>}
        {estado === 'cambios' && <span className="adm-muted">Cambios sin guardar</span>}
        <button className="adm-btn adm-btn--primary" onClick={guardar} disabled={estado === 'guardando' || estado === '' || estado === 'ok'}>
          {estado === 'guardando' ? 'Guardando…' : 'Guardar agenda'}
        </button>
      </div>
    </section>
  );
}

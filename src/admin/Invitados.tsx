import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { EstadoRsvp, InvitadoAdmin, Maestrante } from '../data/tipos';
import { fechaHoraCorta } from '../utils/formato';
import { nombreCompleto, textoWhatsApp } from '../utils/redaccion';
import { api, urlInvitacion } from './api';

const ESTADOS: Record<EstadoRsvp, string> = { pendiente: 'Pendiente', confirmado: 'Confirmado', declinado: 'No asistirá' };
const TRATAMIENTOS = ['MSc.', 'MA.', 'Dr.', 'Dra.', 'Lic.', 'Licda.', 'Ing.', 'Inga.', 'Arq.', 'PhD.'];

type Filtro = 'todos' | EstadoRsvp | 'sin-abrir';
type Borrador = Partial<InvitadoAdmin>;

const vacio: Borrador = { tratamiento: '', nombre: '', cargo: '', unidad: '', institucion: '', mensaje: '', maestrante_id: null };

function Copiar({ texto, etiqueta = 'Copiar enlace' }: { texto: string; etiqueta?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="adm-chip"
      onClick={() =>
        navigator.clipboard.writeText(texto).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        })
      }
    >
      {ok ? 'Copiado ✓' : etiqueta}
    </button>
  );
}

const enlaceWhatsApp = (i: InvitadoAdmin) => `https://wa.me/?text=${encodeURIComponent(textoWhatsApp(i, urlInvitacion(i.slug)))}`;

function exportarCsv(filas: InvitadoAdmin[]) {
  const c = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const encabezado = ['Invitado', 'Cargo', 'Maestrante', 'Estado', 'Comentario', 'Respondió', 'Abrió', 'Visitas', 'URL personalizada'];
  const lineas = filas.map((i) =>
    [nombreCompleto(i), i.cargo, i.maestrante_nombre, ESTADOS[i.estado], i.nota, fechaHoraCorta(i.respondido), fechaHoraCorta(i.primera_visita), i.visitas, urlInvitacion(i.slug)]
      .map(c)
      .join(','),
  );
  const blob = new Blob(['﻿' + [encabezado.map(c).join(','), ...lineas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'invitaciones-cunoc.csv' });
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Invitados({ onError }: { onError: (e: unknown) => void }) {
  const [lista, setLista] = useState<InvitadoAdmin[] | null>(null);
  const [maestrantes, setMaestrantes] = useState<Maestrante[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState<InvitadoAdmin | null>(null);

  const cargar = () =>
    Promise.all([api<InvitadoAdmin[]>('invitados'), api<Maestrante[]>('maestrantes')])
      .then(([i, m]) => {
        setLista(i);
        setMaestrantes(m);
        return i;
      })
      .catch((e) => {
        onError(e);
        setError(e.message);
        return [] as InvitadoAdmin[];
      });

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const l = lista ?? [];
    return {
      total: l.length,
      confirmado: l.filter((i) => i.estado === 'confirmado').length,
      declinado: l.filter((i) => i.estado === 'declinado').length,
      pendiente: l.filter((i) => i.estado === 'pendiente').length,
      abiertas: l.filter((i) => i.visitas > 0).length,
    };
  }, [lista]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (lista ?? []).filter(
      (i) =>
        (filtro === 'todos' || (filtro === 'sin-abrir' ? i.visitas === 0 : i.estado === filtro)) &&
        (!q || [i.nombre, i.cargo, i.unidad, i.institucion, i.maestrante_nombre].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [lista, filtro, busqueda]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    setError('');
    try {
      if (borrador.id) {
        await api(`invitados/${borrador.id}`, { method: 'PUT', body: borrador });
        await cargar();
      } else {
        const { slug } = await api<{ slug: string }>('invitados', { body: borrador });
        const l = await cargar();
        setNuevo(l.find((i) => i.slug === slug) ?? null);
      }
      setBorrador(null);
    } catch (err) {
      onError(err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function eliminar(i: InvitadoAdmin) {
    if (!confirm(`¿Eliminar la invitación de ${nombreCompleto(i)}? Su enlace dejará de ser personalizado.`)) return;
    try {
      await api(`invitados/${i.id}`, { method: 'DELETE' });
      if (nuevo?.id === i.id) setNuevo(null);
      await cargar();
    } catch (err) {
      onError(err);
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  const campo = (k: keyof Borrador) => ({
    value: (borrador?.[k] as string | null | undefined) ?? '',
    onChange: (e: { target: { value: string } }) => setBorrador((b) => ({ ...b, [k]: e.target.value })),
  });

  return (
    <section aria-labelledby="t-invitados">
      <div className="adm-head">
        <div>
          <h1 id="t-invitados">Invitados</h1>
          <p className="adm-muted">Cada invitado recibe un enlace único. Las respuestas aparecen aquí al instante.</p>
        </div>
        <div className="adm-head__actions">
          <button className="adm-btn" onClick={() => lista && exportarCsv(visibles)} disabled={!lista?.length}>
            Exportar CSV
          </button>
          <button className="adm-btn adm-btn--primary" onClick={() => (setBorrador({ ...vacio }), setNuevo(null))}>
            + Nuevo invitado
          </button>
        </div>
      </div>

      <dl className="adm-stats">
        {(
          [
            ['todos', 'Invitados', stats.total],
            ['confirmado', 'Confirmados', stats.confirmado],
            ['declinado', 'No asistirán', stats.declinado],
            ['pendiente', 'Sin respuesta', stats.pendiente],
          ] as const
        ).map(([f, t, n]) => (
          <button key={f} className={`adm-stat adm-stat--${f}${filtro === f ? ' is-active' : ''}`} onClick={() => setFiltro(f)}>
            <dt>{t}</dt>
            <dd>{n}</dd>
          </button>
        ))}
        <div className="adm-stat adm-stat--static">
          <dt>Abrieron su invitación</dt>
          <dd>
            {stats.abiertas}
            <small> / {stats.total}</small>
          </dd>
        </div>
      </dl>

      {error && <p className="adm-error" role="alert">{error}</p>}

      {nuevo && (
        <div className="adm-notice" role="status">
          <div>
            <strong>Invitación creada para {nombreCompleto(nuevo)}.</strong>
            <code>{urlInvitacion(nuevo.slug)}</code>
          </div>
          <div className="adm-row-actions">
            <Copiar texto={urlInvitacion(nuevo.slug)} />
            <a className="adm-chip adm-chip--wa" href={enlaceWhatsApp(nuevo)} target="_blank" rel="noopener noreferrer">
              Enviar por WhatsApp
            </a>
            <button className="adm-chip" onClick={() => setNuevo(null)} aria-label="Cerrar aviso">
              ✕
            </button>
          </div>
        </div>
      )}

      {borrador && (
        <form className="adm-form adm-card" onSubmit={guardar}>
          <h2>{borrador.id ? `Editar · ${borrador.nombre}` : 'Nuevo invitado'}</h2>
          <div className="adm-grid">
            <label className="adm-field adm-field--sm">
              <span>Tratamiento</span>
              <input list="tratamientos" placeholder="MSc." {...campo('tratamiento')} />
              <datalist id="tratamientos">
                {TRATAMIENTOS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="adm-field adm-field--lg">
              <span>Nombre *</span>
              <input required maxLength={120} placeholder="Nombre y apellido" {...campo('nombre')} autoFocus />
            </label>
            <label className="adm-field">
              <span>Cargo</span>
              <input maxLength={160} placeholder="Coordinador de Maestrías" {...campo('cargo')} />
            </label>
            <label className="adm-field">
              <span>Unidad</span>
              <input maxLength={160} placeholder="División de Ciencias Económicas" {...campo('unidad')} />
            </label>
            <label className="adm-field">
              <span>Institución</span>
              <input maxLength={160} {...campo('institucion')} />
            </label>
            <label className="adm-field">
              <span>Invita (maestrante)</span>
              <select
                value={borrador.maestrante_id ?? ''}
                onChange={(e) => setBorrador((b) => ({ ...b, maestrante_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">— Junta Directiva (sin maestrante) —</option>
                {maestrantes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {m.grupo ? ` · Grupo ${m.grupo}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {borrador.id && (
              <label className="adm-field">
                <span>Estado de confirmación</span>
                <select value={borrador.estado} onChange={(e) => setBorrador((b) => ({ ...b, estado: e.target.value as EstadoRsvp }))}>
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="adm-field adm-field--full">
              <span>Mensaje personalizado (opcional — reemplaza el primer párrafo)</span>
              <textarea rows={3} maxLength={600} {...campo('mensaje')} />
            </label>
          </div>
          <div className="adm-form__actions">
            <button type="button" className="adm-btn" onClick={() => setBorrador(null)}>
              Cancelar
            </button>
            <button className="adm-btn adm-btn--primary">{borrador.id ? 'Guardar cambios' : 'Crear invitación'}</button>
          </div>
        </form>
      )}

      <div className="adm-toolbar">
        <input type="search" placeholder="Buscar por nombre, cargo o maestrante…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar invitados" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtrar por estado">
          <option value="todos">Todos</option>
          <option value="confirmado">Confirmados</option>
          <option value="declinado">No asistirán</option>
          <option value="pendiente">Sin respuesta</option>
          <option value="sin-abrir">No han abierto</option>
        </select>
      </div>

      {lista === null ? (
        <p className="adm-muted">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="adm-empty">{lista.length ? 'Ningún invitado coincide con el filtro.' : 'Aún no hay invitados. Cree el primero con «+ Nuevo invitado».'}</p>
      ) : (
        <ul className="adm-list">
          {visibles.map((i) => (
            <li key={i.id} className="adm-item">
              <div className="adm-item__who">
                <strong>{nombreCompleto(i)}</strong>
                {(i.cargo || i.unidad) && <span>{[i.cargo, i.unidad].filter(Boolean).join(' · ')}</span>}
                <span className="adm-muted">Invita: {i.maestrante_nombre ?? 'Junta Directiva'}</span>
              </div>
              <div className="adm-item__status">
                <span className={`adm-badge adm-badge--${i.estado}`}>{ESTADOS[i.estado]}</span>
                {i.respondido && <span className="adm-muted">{fechaHoraCorta(i.respondido)}</span>}
                {i.nota && <q className="adm-note">{i.nota}</q>}
              </div>
              <div className="adm-item__seen">
                {i.visitas ? (
                  <>
                    <span>Abierta {i.visitas === 1 ? '1 vez' : `${i.visitas} veces`}</span>
                    <span className="adm-muted">Última: {fechaHoraCorta(i.ultima_visita)}</span>
                  </>
                ) : (
                  <span className="adm-muted">Aún no la abre</span>
                )}
              </div>
              <div className="adm-row-actions">
                <Copiar texto={urlInvitacion(i.slug)} />
                <a className="adm-chip adm-chip--wa" href={enlaceWhatsApp(i)} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                <a className="adm-chip" href={`/invitacion/${i.slug}?vista=admin`} target="_blank" rel="noopener">
                  Ver
                </a>
                <button className="adm-chip" onClick={() => (setBorrador({ ...i }), setNuevo(null), scrollTo({ top: 0, behavior: 'smooth' }))}>
                  Editar
                </button>
                <button className="adm-chip adm-chip--danger" onClick={() => eliminar(i)}>
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

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { EntradaPublica, MaestranteAdmin } from '../data/tipos';
import { codigoLegible, etiquetaEntrada } from '../utils/entradas';
import { fechaHoraCorta } from '../utils/formato';
import { api } from './api';

type Borrador = { id?: number; nombre: string; carne: string; grupo: string; acompanantes: string };
const vacio: Borrador = { nombre: '', carne: '', grupo: '', acompanantes: '0' };

/** Convierte filas pegadas desde Excel/Sheets (tabulador, punto y coma o coma). */
function leerFilas(texto: string) {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(l.includes('\t') ? '\t' : l.includes(';') ? ';' : ',').map((c) => c.trim()))
    .filter((c) => !/^nombre$/i.test(c[0])) // ignora encabezado
    .map(([nombre, carne, grupo, acompanantes]) => ({ nombre, carne, grupo, acompanantes: acompanantes || '0' }));
}

function exportarCsv(lista: MaestranteAdmin[]) {
  const c = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Nombre', 'Carné', 'Grupo', 'Acompañantes', 'Entradas', 'Ingresados'], ...lista.map((m) => [m.nombre, m.carne, m.grupo, m.acompanantes, m.entradas, m.ingresados ?? 0])];
  const blob = new Blob(['﻿' + filas.map((f) => f.map(c).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'maestrantes-entradas.csv' });
  a.click();
  URL.revokeObjectURL(a.href);
}

function Pin({ onError }: { onError: (e: unknown) => void }) {
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api<{ configurado: boolean }>('pin').then((r) => setConfigurado(r.configurado)).catch(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      await api('pin', { method: 'PUT', body: { pin } });
      setConfigurado(true);
      setPin('');
      setMsg('PIN guardado. Las sesiones anteriores de la puerta se cerraron.');
    } catch (err) {
      onError(err);
      setMsg(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }
  return (
    <form className="adm-card adm-inline" onSubmit={guardar}>
      <div className="adm-field adm-field--lg">
        <span>Control de acceso en la puerta</span>
        <p className="adm-muted">
          Quienes escanean abren <a href="/acceso" target="_blank" rel="noopener">{location.host}/acceso</a> en su teléfono e ingresan este PIN. Solo
          ven el escáner. {configurado === false && <strong>Aún no hay PIN configurado.</strong>}
        </p>
        {msg && <p className="adm-ok">{msg}</p>}
      </div>
      <label className="adm-field adm-field--sm">
        <span>{configurado ? 'Cambiar PIN' : 'Nuevo PIN'}</span>
        <input inputMode="numeric" pattern="\d{6,10}" title="Entre 6 y 10 dígitos" required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="6–10 dígitos" />
      </label>
      <div className="adm-form__actions">
        <button className="adm-btn adm-btn--primary">Guardar PIN</button>
      </div>
    </form>
  );
}

export function Maestrantes({ onError }: { onError: (e: unknown) => void }) {
  const [lista, setLista] = useState<MaestranteAdmin[] | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [importar, setImportar] = useState<string | null>(null);
  const [informe, setInforme] = useState<{ creados: number; actualizados: number; errores: string[] } | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [entradas, setEntradas] = useState<EntradaPublica[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  const fallo = (e: unknown) => (onError(e), setError(e instanceof Error ? e.message : 'Error'));
  const cargar = () => api<MaestranteAdmin[]>('maestrantes').then(setLista).catch(fallo);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const l = lista ?? [];
    return {
      maestrantes: l.length,
      sinCarne: l.filter((m) => !m.carne).length,
      entradas: l.reduce((s, m) => s + m.entradas, 0),
      ingresados: l.reduce((s, m) => s + (m.ingresados ?? 0), 0),
    };
  }, [lista]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (lista ?? []).filter((m) => !q || m.nombre.toLowerCase().includes(q) || m.carne?.toLowerCase().includes(q));
  }, [lista, busqueda]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    setError('');
    try {
      await api(borrador.id ? `maestrantes/${borrador.id}` : 'maestrantes', { method: borrador.id ? 'PUT' : 'POST', body: borrador });
      setBorrador(null);
      await cargar();
      if (abierto === borrador.id) verEntradas(borrador.id!);
    } catch (err) {
      fallo(err);
    }
  }

  async function procesarImportacion() {
    const filas = leerFilas(importar ?? '');
    if (!filas.length) return setError('No se encontraron filas.');
    setError('');
    try {
      setInforme(await api('maestrantes/importar', { body: { filas } }));
      setImportar(null);
      await cargar();
    } catch (err) {
      fallo(err);
    }
  }

  async function verEntradas(id: number) {
    if (abierto === id) return setAbierto(null);
    setAbierto(id);
    setEntradas(await api<EntradaPublica[]>(`entradas/${id}`).catch(() => []));
  }

  async function reiniciar(m: MaestranteAdmin) {
    if (!confirm(`¿Anular los ingresos registrados de ${m.nombre} y sus acompañantes?`)) return;
    await api(`maestrantes/${m.id}/reiniciar`, { method: 'POST' }).catch(fallo);
    await cargar();
    if (abierto === m.id) setEntradas(await api<EntradaPublica[]>(`entradas/${m.id}`).catch(() => []));
  }

  async function reiniciarTodo() {
    if (!confirm('¿Anular TODOS los ingresos registrados? Úselo solo después de una prueba, nunca durante el evento.')) return;
    await api('entradas/reiniciar', { method: 'POST' }).catch(fallo);
    cargar();
  }

  async function eliminar(m: MaestranteAdmin) {
    if (!confirm(`¿Eliminar a ${m.nombre}? Sus entradas dejarán de ser válidas.`)) return;
    await api(`maestrantes/${m.id}`, { method: 'DELETE' }).catch(fallo);
    cargar();
  }

  const campo = (k: keyof Borrador) => ({
    value: borrador?.[k] ?? '',
    onChange: (e: { target: { value: string } }) => setBorrador((b) => ({ ...(b ?? vacio), [k]: e.target.value })),
  });

  return (
    <section aria-labelledby="t-maestrantes">
      <div className="adm-head">
        <div>
          <h1 id="t-maestrantes">Maestrantes y entradas</h1>
          <p className="adm-muted">
            Cada maestrante descarga desde la invitación general, con su carné, una entrada QR para sí y una por cada acompañante. Cada
            entrada permite un solo ingreso.
          </p>
        </div>
        <div className="adm-head__actions">
          <button className="adm-btn" onClick={() => lista && exportarCsv(lista)} disabled={!lista?.length}>
            Exportar CSV
          </button>
          <button className="adm-btn" onClick={() => (setImportar(''), setBorrador(null), setInforme(null))}>
            Cargar desde Excel
          </button>
          <button className="adm-btn adm-btn--primary" onClick={() => (setBorrador({ ...vacio }), setImportar(null))}>
            + Nuevo maestrante
          </button>
        </div>
      </div>

      <dl className="adm-stats">
        <div className="adm-stat adm-stat--static adm-stat--todos">
          <dt>Maestrantes</dt>
          <dd>{stats.maestrantes}</dd>
        </div>
        <div className="adm-stat adm-stat--static adm-stat--pendiente">
          <dt>Entradas emitidas</dt>
          <dd>{stats.entradas}</dd>
        </div>
        <div className="adm-stat adm-stat--static adm-stat--confirmado">
          <dt>Ingresaron</dt>
          <dd>
            {stats.ingresados}
            <small> / {stats.entradas}</small>
          </dd>
        </div>
        <div className="adm-stat adm-stat--static adm-stat--declinado">
          <dt>Sin carné</dt>
          <dd>{stats.sinCarne}</dd>
        </div>
      </dl>

      <Pin onError={onError} />

      {error && <p className="adm-error" role="alert">{error}</p>}
      {informe && (
        <div className="adm-notice" role="status">
          <div>
            <strong>
              Carga terminada: {informe.creados} nuevos, {informe.actualizados} actualizados.
            </strong>
            {informe.errores.map((e) => (
              <span key={e} className="adm-error-line">{e}</span>
            ))}
          </div>
          <button className="adm-chip" onClick={() => setInforme(null)} aria-label="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      {importar !== null && (
        <div className="adm-card">
          <h2>Cargar maestrantes desde una hoja de cálculo</h2>
          <p className="adm-muted">
            Copie las columnas <strong>Nombre · Carné · Grupo · Acompañantes</strong> desde Excel o Google Sheets y péguelas aquí (una
            persona por fila). Si el carné ya existe, se actualizan sus datos.
          </p>
          <textarea
            className="adm-paste"
            rows={8}
            value={importar}
            onChange={(e) => setImportar(e.target.value)}
            placeholder={'Noe Jeremías Escobar Bautista\t201812345\t1\t3\nAna Lucía Pérez\t201954321\t2\t2'}
          />
          <p className="adm-muted">{leerFilas(importar).length} fila(s) detectadas.</p>
          <div className="adm-form__actions">
            <button className="adm-btn" onClick={() => setImportar(null)}>
              Cancelar
            </button>
            <button className="adm-btn adm-btn--primary" onClick={procesarImportacion} disabled={!leerFilas(importar).length}>
              Cargar
            </button>
          </div>
        </div>
      )}

      {borrador && (
        <form className="adm-form adm-card" onSubmit={guardar}>
          <h2>{borrador.id ? `Editar · ${borrador.nombre}` : 'Nuevo maestrante'}</h2>
          <div className="adm-grid">
            <label className="adm-field adm-field--full">
              <span>Nombre completo *</span>
              <input required maxLength={120} {...campo('nombre')} autoFocus />
            </label>
            <label className="adm-field">
              <span>Carné</span>
              <input inputMode="numeric" maxLength={20} {...campo('carne')} />
            </label>
            <label className="adm-field">
              <span>Grupo de Seminario</span>
              <input type="number" min={1} max={99} {...campo('grupo')} />
            </label>
            <label className="adm-field">
              <span>Acompañantes permitidos</span>
              <input type="number" min={0} max={10} required {...campo('acompanantes')} />
            </label>
          </div>
          <div className="adm-form__actions">
            <button type="button" className="adm-btn" onClick={() => setBorrador(null)}>
              Cancelar
            </button>
            <button className="adm-btn adm-btn--primary">{borrador.id ? 'Guardar cambios' : 'Agregar'}</button>
          </div>
        </form>
      )}

      <div className="adm-toolbar">
        <input type="search" placeholder="Buscar por nombre o carné…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar maestrantes" />
        <button className="adm-btn" onClick={reiniciarTodo} disabled={!stats.ingresados}>
          Anular todos los ingresos
        </button>
      </div>

      {lista === null ? (
        <p className="adm-muted">Cargando…</p>
      ) : !visibles.length ? (
        <p className="adm-empty">{lista.length ? 'Ningún maestrante coincide.' : 'Aún no hay maestrantes. Agréguelos uno a uno o cárguelos desde Excel.'}</p>
      ) : (
        <ul className="adm-list">
          {visibles.map((m) => (
            <li key={m.id} className="adm-item adm-item--m">
              <div className="adm-item__who">
                <strong>{m.nombre}</strong>
                <span className="adm-muted">
                  {m.carne ? `Carné ${m.carne}` : <em className="adm-warn">Sin carné: no puede descargar entradas</em>}
                  {m.grupo ? ` · Grupo ${m.grupo}` : ''}
                </span>
              </div>
              <div className="adm-item__seen">
                <span>
                  1 + {m.acompanantes} acompañante{m.acompanantes === 1 ? '' : 's'}
                </span>
                <span className={m.ingresados ? 'adm-ok' : 'adm-muted'}>
                  Ingresaron {m.ingresados ?? 0} de {m.entradas}
                </span>
              </div>
              <div className="adm-row-actions">
                <button className="adm-chip" onClick={() => verEntradas(m.id)} aria-expanded={abierto === m.id}>
                  {abierto === m.id ? 'Ocultar entradas' : 'Ver entradas'}
                </button>
                <button
                  className="adm-chip"
                  onClick={() => (
                    setBorrador({ id: m.id, nombre: m.nombre, carne: m.carne ?? '', grupo: m.grupo?.toString() ?? '', acompanantes: String(m.acompanantes) }),
                    setImportar(null),
                    scrollTo({ top: 0, behavior: 'smooth' })
                  )}
                >
                  Editar
                </button>
                {!!m.ingresados && (
                  <button className="adm-chip" onClick={() => reiniciar(m)}>
                    Anular ingresos
                  </button>
                )}
                <button className="adm-chip adm-chip--danger" onClick={() => eliminar(m)}>
                  Eliminar
                </button>
              </div>
              {abierto === m.id && (
                <ul className="adm-tickets">
                  {entradas.map((e) => (
                    <li key={e.codigo}>
                      <span>{etiquetaEntrada(e.numero, m.acompanantes)}</span>
                      <code>{codigoLegible(e.codigo)}</code>
                      <span className={e.ingreso ? 'adm-ok' : 'adm-muted'}>{e.ingreso ? `Ingresó ${fechaHoraCorta(e.ingreso)}` : 'Sin usar'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

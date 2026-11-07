import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Logo } from '../data/tipos';
import { api } from './api';

const SUGERENCIAS = [
  'Escudo de la Universidad de San Carlos de Guatemala',
  'Centro Universitario de Occidente – CUNOC',
  'Departamento de Estudios de Postgrado – SEP CUNOC',
];

/** Dimensiones reales de la imagen, para reservar su espacio sin deformarla. */
function medir(file: File): Promise<{ ancho: number; alto: number }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      res({ ancho: Math.round(img.naturalWidth) || 200, alto: Math.round(img.naturalHeight) || 200 });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => res({ ancho: 200, alto: 200 });
    img.src = URL.createObjectURL(file);
  });
}

export function Logos({ onError }: { onError: (e: unknown) => void }) {
  const [lista, setLista] = useState<Logo[] | null>(null);
  const [alt, setAlt] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const cargar = () =>
    api<Logo[]>('logos')
      .then(setLista)
      .catch((e) => (onError(e), setError(e.message)));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subir(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setSubiendo(true);
    setError('');
    try {
      const { ancho, alto } = await medir(archivo);
      const form = new FormData();
      form.set('archivo', archivo);
      form.set('alt', alt);
      form.set('ancho', String(ancho));
      form.set('alto', String(alto));
      setLista(await api<Logo[]>('logos', { form }));
      setAlt('');
      setArchivo(null);
      if (input.current) input.current.value = '';
    } catch (err) {
      onError(err);
      setError(err instanceof Error ? err.message : 'No se pudo subir');
    } finally {
      setSubiendo(false);
    }
  }

  async function mover(i: number, dir: -1 | 1) {
    if (!lista) return;
    const orden = [...lista];
    [orden[i], orden[i + dir]] = [orden[i + dir], orden[i]];
    setLista(orden);
    await Promise.all(orden.map((l, n) => api(`logos/${l.id}`, { method: 'PUT', body: { alt: l.alt, orden: n } }))).catch(onError);
    cargar();
  }

  async function eliminar(l: Logo) {
    if (!confirm(`¿Eliminar el logotipo «${l.alt}»?`)) return;
    await api(`logos/${l.id}`, { method: 'DELETE' }).catch(onError);
    cargar();
  }

  return (
    <section aria-labelledby="t-logos">
      <div className="adm-head">
        <div>
          <h1 id="t-logos">Logotipos</h1>
          <p className="adm-muted">
            Use únicamente archivos oficiales (PNG o SVG con fondo transparente, máx. 1 MB). Se muestran en la cabecera en este orden, con
            altura uniforme y sin deformarse.
          </p>
        </div>
      </div>

      {lista && lista.length > 0 && (
        <div className="adm-logo-preview" aria-label="Vista previa de la cabecera">
          {lista.map((l) => (
            <img key={l.id} src={l.src} alt={l.alt} width={l.ancho} height={l.alto} />
          ))}
        </div>
      )}

      <form className="adm-form adm-card adm-inline" onSubmit={subir}>
        <label className="adm-field">
          <span>Archivo</span>
          <input ref={input} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" required onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </label>
        <label className="adm-field adm-field--lg">
          <span>Descripción (texto alternativo)</span>
          <input list="sugerencias-logo" required maxLength={160} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Escudo de la Universidad…" />
          <datalist id="sugerencias-logo">
            {SUGERENCIAS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <div className="adm-form__actions">
          <button className="adm-btn adm-btn--primary" disabled={subiendo || !archivo}>
            {subiendo ? 'Subiendo…' : 'Subir logotipo'}
          </button>
        </div>
      </form>
      {error && <p className="adm-error" role="alert">{error}</p>}

      {lista === null ? (
        <p className="adm-muted">Cargando…</p>
      ) : !lista.length ? (
        <p className="adm-empty">Aún no hay logotipos. La cabecera se muestra sin ellos hasta que se suban.</p>
      ) : (
        <ul className="adm-list">
          {lista.map((l, i) => (
            <li key={l.id} className="adm-item adm-item--compact">
              <img className="adm-logo-thumb" src={l.src} alt="" width={l.ancho} height={l.alto} />
              <div className="adm-item__who">
                <strong>{l.alt}</strong>
                <span className="adm-muted">
                  {l.ancho} × {l.alto} px
                </span>
              </div>
              <div className="adm-row-actions">
                <button className="adm-chip" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Mover ${l.alt} a la izquierda`}>
                  ←
                </button>
                <button className="adm-chip" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label={`Mover ${l.alt} a la derecha`}>
                  →
                </button>
                <button className="adm-chip adm-chip--danger" onClick={() => eliminar(l)}>
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

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Logo } from '../data/tipos';
import { api } from './api';
import { limpiarLogo } from './limpiarLogo';

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
  const [limpiar, setLimpiar] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [ajustando, setAjustando] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const cargar = () =>
    api<Logo[]>('logos')
      .then(setLista)
      .catch((e) => (onError(e), setError(e.message)));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Los PNG/JPG/WEBP se limpian (fondo y márgenes); el SVG se usa tal cual. */
  async function preparar(origen: Blob, conLimpieza: boolean) {
    const form = new FormData();
    if (conLimpieza && origen.type !== 'image/svg+xml') {
      const r = await limpiarLogo(origen);
      form.set('archivo', new File([r.blob], 'logo.png', { type: 'image/png' }));
      form.set('ancho', String(r.ancho));
      form.set('alto', String(r.alto));
      return { form, cambio: r.cambio };
    }
    const f = origen instanceof File ? origen : new File([origen], 'logo', { type: origen.type });
    const { ancho, alto } = await medir(f);
    form.set('archivo', f);
    form.set('ancho', String(ancho));
    form.set('alto', String(alto));
    return { form, cambio: false };
  }

  async function subir(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setSubiendo(true);
    setError('');
    setAviso('');
    try {
      const { form } = await preparar(archivo, limpiar);
      form.set('alt', alt);
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

  /** Aplica la limpieza a un logotipo ya subido y reemplaza su imagen. */
  async function ajustar(l: Logo) {
    setAjustando(l.id);
    setError('');
    setAviso('');
    try {
      const original = await (await fetch(l.src)).blob();
      if (original.type === 'image/svg+xml') {
        setAviso('Los SVG no necesitan este ajuste.');
        return;
      }
      const { form, cambio } = await preparar(original, true);
      if (!cambio) {
        setAviso(`«${l.alt}» ya estaba optimizado.`);
        return;
      }
      setLista(await api<Logo[]>(`logos/${l.id}/archivo`, { form }));
      setAviso(`Listo: «${l.alt}» quedó optimizado.`);
    } catch (err) {
      onError(err);
      setError(err instanceof Error ? err.message : 'No se pudo ajustar');
    } finally {
      setAjustando(null);
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
            Use únicamente archivos oficiales (PNG, JPG o SVG, máx. 1 MB). Al subirlos se quita el fondo liso que los rodea y se
            recortan los márgenes, para que todos se vean del mismo tamaño. Se muestran en la cabecera en este orden.
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
        <label className="adm-check">
          <input type="checkbox" checked={limpiar} onChange={(e) => setLimpiar(e.target.checked)} />
          <span>Quitar fondo y márgenes</span>
        </label>
        <div className="adm-form__actions">
          <button className="adm-btn adm-btn--primary" disabled={subiendo || !archivo}>
            {subiendo ? 'Subiendo…' : 'Subir logotipo'}
          </button>
        </div>
      </form>
      {error && <p className="adm-error" role="alert">{error}</p>}
      {aviso && <p className="adm-ok" role="status">{aviso}</p>}

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
                <button className="adm-chip" onClick={() => ajustar(l)} disabled={ajustando !== null}>
                  {ajustando === l.id ? 'Optimizando…' : 'Optimizar (fondo, márgenes y peso)'}
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

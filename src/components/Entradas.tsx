import { useState, type FormEvent } from 'react';
import type { MisEntradas } from '../data/tipos';
import { useDatos } from '../hooks/useInvitee';
import { codigoLegible, descargar, etiquetaEntrada, qrSvg, ticketPng, urlAcceso } from '../utils/entradas';
import { fechaHoraCorta } from '../utils/formato';
import { slugify } from '../utils/slugs';
import { Ornament } from './Ornament';

function Qr({ codigo }: { codigo: string }) {
  const { n, d } = qrSvg(urlAcceso(codigo));
  return (
    <svg className="ticket__qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label={`Código QR de la entrada ${codigoLegible(codigo)}`}>
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#102A4C" shapeRendering="crispEdges" />
    </svg>
  );
}

/**
 * Apartado de la invitación general: cada maestrante escribe su carné y descarga
 * una entrada QR para sí y una para cada acompañante (un solo ingreso cada una).
 */
export function Entradas() {
  const { evento, invitado } = useDatos();
  const [carne, setCarne] = useState('');
  const [datos, setDatos] = useState<MisEntradas | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState<string | null>(null);

  if (invitado || !evento.entradasActivas) return null;

  async function buscar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/entradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carne }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? 'No fue posible consultar sus entradas.');
      setDatos(j);
    } catch (err) {
      setDatos(null);
      setError(err instanceof Error ? err.message : 'No fue posible consultar sus entradas.');
    } finally {
      setCargando(false);
    }
  }

  async function archivo(codigo: string, numero: number) {
    const blob = await ticketPng({ codigo, numero, acompanantes: datos!.acompanantes, nombre: datos!.nombre, evento });
    const nombre = `entrada-${slugify(datos!.nombre).split('-')[0]}-${numero === 0 ? 'maestrante' : `acompanante-${numero}`}.png`;
    return { blob, nombre };
  }

  async function bajar(codigo: string, numero: number) {
    setGenerando(codigo);
    try {
      const { blob, nombre } = await archivo(codigo, numero);
      descargar(blob, nombre);
    } finally {
      setGenerando(null);
    }
  }

  /** En teléfonos: compartir directamente por WhatsApp con el acompañante. */
  async function compartir(codigo: string, numero: number) {
    setGenerando(codigo);
    try {
      const { blob, nombre } = await archivo(codigo, numero);
      const file = new File([blob], nombre, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Entrada · Cierre de Maestría CUNOC' }).catch(() => {});
      } else descargar(blob, nombre);
    } finally {
      setGenerando(null);
    }
  }

  async function bajarTodas() {
    for (const e of datos!.entradas) {
      await bajar(e.codigo, e.numero);
      await new Promise((r) => setTimeout(r, 400)); // algunos navegadores bloquean descargas simultáneas
    }
  }

  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <section className="tickets" id="entradas" aria-labelledby="titulo-entradas" data-reveal>
      <div className="tickets__head">
        <Ornament />
        <p className="eyebrow eyebrow--gold">Maestrantes</p>
        <h2 id="titulo-entradas" className="tickets__title">
          Sus entradas
        </h2>
        <p className="tickets__text">
          Escriba su número de carné para descargar su entrada y la de cada uno de sus acompañantes. Cada código QR es personal y
          permite un solo ingreso.
        </p>
      </div>

      <form className="tickets__form" onSubmit={buscar}>
        <label className="tickets__field">
          <span>Número de carné</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={20}
            value={carne}
            onChange={(e) => setCarne(e.target.value)}
            placeholder="Ej. 201812345"
          />
        </label>
        <button className="btn btn--primary" disabled={cargando}>
          <span>{cargando ? 'Buscando…' : 'Ver mis entradas'}</span>
        </button>
      </form>
      {error && (
        <p className="tickets__error" role="alert">
          {error}
        </p>
      )}

      {datos && (
        <div className="tickets__result" role="status">
          <p className="tickets__who">
            <strong>{datos.nombre}</strong>
            <span>
              {datos.grupo ? `Grupo No. ${datos.grupo} · ` : ''}
              {datos.entradas.length === 1 ? '1 entrada' : `${datos.entradas.length} entradas`} · usted
              {datos.acompanantes ? ` y ${datos.acompanantes === 1 ? '1 acompañante' : `${datos.acompanantes} acompañantes`}` : ''}
            </span>
          </p>

          <ul className="tickets__grid">
            {datos.entradas.map((e) => (
              <li key={e.codigo} className={`ticket${e.ingreso ? ' is-used' : ''}`}>
                <p className="ticket__type">{etiquetaEntrada(e.numero, datos.acompanantes)}</p>
                <Qr codigo={e.codigo} />
                <p className="ticket__code">{codigoLegible(e.codigo)}</p>
                {e.ingreso ? (
                  <p className="ticket__used">Utilizada · {fechaHoraCorta(e.ingreso)}</p>
                ) : (
                  <div className="ticket__actions">
                    <button type="button" className="link" onClick={() => bajar(e.codigo, e.numero)} disabled={generando === e.codigo}>
                      {generando === e.codigo ? 'Preparando…' : 'Descargar'}
                    </button>
                    {puedeCompartir && (
                      <button type="button" className="link" onClick={() => compartir(e.codigo, e.numero)} disabled={generando === e.codigo}>
                        Compartir
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {datos.entradas.length > 1 && (
            <button type="button" className="btn btn--ghost" onClick={bajarTodas} disabled={!!generando}>
              <span>Descargar todas</span>
            </button>
          )}
          <p className="tickets__note">Presente cada código en la entrada, desde el teléfono o impreso. Comparta cada entrada de acompañante solo con esa persona.</p>
        </div>
      )}
    </section>
  );
}

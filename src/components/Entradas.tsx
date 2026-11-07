import { useState, type FormEvent } from 'react';
import type { ConsultaEntradas, MisEntradas } from '../data/tipos';
import { useDatos } from '../hooks/useInvitee';
import { codigoLegible, descargar, entradasPdf, etiquetaEntrada, qrSvg, urlAcceso } from '../utils/entradas';
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

async function post<T>(ruta: string, carne: string): Promise<T> {
  const r = await fetch(`/api/entradas/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ carne }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error ?? 'No fue posible completar la solicitud.');
  return j as T;
}

const acompanantesTexto = (n: number) => (n === 0 ? 'Sin acompañantes' : n === 1 ? '1 acompañante' : `${n} acompañantes`);

/**
 * Generación de entradas para maestrantes (invitación general):
 *  1. Escribe su carné → ve su nombre, grupo y acompañantes.
 *  2. Confirma que es él → se generan UNA sola vez (solo el panel puede liberarlas).
 *  3. Recibe un PDF con una página por persona; también se muestran en pantalla.
 */
export function Entradas() {
  const { evento, invitado } = useDatos();
  const [carne, setCarne] = useState('');
  const [consulta, setConsulta] = useState<ConsultaEntradas | null>(null);
  const [entradas, setEntradas] = useState<MisEntradas | null>(null);
  const [pdf, setPdf] = useState<{ blob: Blob; nombre: string } | null>(null);
  const [paso, setPaso] = useState<'' | 'buscando' | 'generando'>('');
  const [error, setError] = useState('');

  if (invitado || !evento.entradasActivas) return null;

  async function buscar(e: FormEvent) {
    e.preventDefault();
    setPaso('buscando');
    setError('');
    setConsulta(null);
    try {
      setConsulta(await post<ConsultaEntradas>('consultar', carne));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible consultar.');
    } finally {
      setPaso('');
    }
  }

  async function generar() {
    setPaso('generando');
    setError('');
    try {
      const datos = await post<MisEntradas>('generar', carne);
      setEntradas(datos);
      const blob = await entradasPdf(datos.entradas, { acompanantes: datos.acompanantes, nombre: datos.nombre, evento });
      const archivo = { blob, nombre: `entradas-cierre-maestria-${slugify(datos.nombre).split('-').slice(0, 2).join('-')}.pdf` };
      setPdf(archivo);
      descargar(archivo.blob, archivo.nombre);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar sus entradas.');
    } finally {
      setPaso('');
    }
  }

  async function compartir() {
    if (!pdf) return;
    const file = new File([pdf.blob], pdf.nombre, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Entradas · Cierre de Maestría CUNOC' }).catch(() => {});
    else descargar(pdf.blob, pdf.nombre);
  }

  const reiniciar = () => (setConsulta(null), setCarne(''), setError(''));

  return (
    <section className="tickets-section" aria-labelledby="titulo-entradas">
      <div className="container">
        <div className="tickets" id="entradas" data-reveal>
          <div className="tickets__head">
            <Ornament />
            <p className="eyebrow eyebrow--gold">Maestrantes</p>
            <h2 id="titulo-entradas" className="tickets__title">
              Genere sus entradas
            </h2>
            <p className="tickets__text">
              Con su número de carné obtendrá, en un solo PDF, su entrada y la de cada uno de sus acompañantes. Cada código QR es
              personal y permite un solo ingreso.
            </p>
          </div>

          {/* Paso 1 · carné */}
          {!consulta && !entradas && (
            <form className="tickets__form" onSubmit={buscar}>
              <label className="tickets__field">
                <span>Número de carné</span>
                <input inputMode="numeric" autoComplete="off" required maxLength={20} value={carne} onChange={(e) => setCarne(e.target.value)} placeholder="Ej. 201812345" />
              </label>
              <button className="btn btn--primary" disabled={paso === 'buscando'}>
                <span>{paso === 'buscando' ? 'Buscando…' : 'Continuar'}</span>
              </button>
            </form>
          )}

          {/* Paso 2 · datos y confirmación */}
          {consulta && !entradas && (
            <div className="tickets__confirm">
              <dl className="tickets__facts">
                <div className="tickets__fact tickets__fact--wide">
                  <dt>Maestrante</dt>
                  <dd>{consulta.nombre}</dd>
                </div>
                <div className="tickets__fact">
                  <dt>Grupo</dt>
                  <dd>{consulta.grupo ? `No. ${consulta.grupo}` : '—'}</dd>
                </div>
                <div className="tickets__fact">
                  <dt>Invitados</dt>
                  <dd>{acompanantesTexto(consulta.acompanantes)}</dd>
                </div>
              </dl>

              {consulta.generadas ? (
                <div className="tickets__note-box tickets__note-box--done" role="status">
                  <p className="tickets__note-title">Sus entradas ya fueron generadas</p>
                  <p>
                    Se generaron el {fechaHoraCorta(consulta.generadas)}. Por seguridad no pueden generarse de nuevo. Si las perdió o no fue
                    usted quien las generó, comuníquese con la Junta Directiva para que las libere.
                  </p>
                  <button type="button" className="link" onClick={reiniciar}>
                    Consultar otro carné
                  </button>
                </div>
              ) : (
                <>
                  <div className="tickets__note-box" role="note">
                    <p className="tickets__note-title">Nota importante</p>
                    <p>
                      Confirme que usted es <strong>{consulta.nombre}</strong>. Sus entradas se generan <strong>una sola vez</strong>: después
                      no podrán volver a generarse, a menos que la Junta Directiva las libere desde el panel. Guarde el PDF en su teléfono.
                    </p>
                  </div>
                  <div className="tickets__actions">
                    <button type="button" className="btn btn--primary" onClick={generar} disabled={paso === 'generando'}>
                      <span>{paso === 'generando' ? 'Generando entradas…' : 'Sí, soy yo · Generar entradas'}</span>
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={reiniciar} disabled={paso === 'generando'}>
                      <span>No soy yo</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="tickets__error" role="alert">
              {error}
            </p>
          )}

          {/* Paso 3 · PDF y vista en pantalla */}
          {entradas && (
            <div className="tickets__result" role="status">
              <p className="tickets__who">
                <strong>Entradas generadas</strong>
                <span>
                  {entradas.nombre}
                  {entradas.grupo ? ` · Grupo No. ${entradas.grupo}` : ''} · {entradas.entradas.length}{' '}
                  {entradas.entradas.length === 1 ? 'entrada' : 'entradas'}
                </span>
              </p>
              <div className="tickets__actions">
                <button type="button" className="btn btn--primary" onClick={() => pdf && descargar(pdf.blob, pdf.nombre)} disabled={!pdf}>
                  <span>{pdf ? 'Descargar PDF' : 'Preparando PDF…'}</span>
                </button>
                {'share' in navigator && (
                  <button type="button" className="btn btn--ghost" onClick={compartir} disabled={!pdf}>
                    <span>Compartir PDF</span>
                  </button>
                )}
              </div>
              <p className="tickets__text">Si la descarga no inicia, guarde una captura de pantalla de cada entrada.</p>
              <ul className="tickets__grid">
                {entradas.entradas.map((e) => (
                  <li key={e.codigo} className="ticket">
                    <p className="ticket__type">{etiquetaEntrada(e.numero, entradas.acompanantes)}</p>
                    <Qr codigo={e.codigo} />
                    <p className="ticket__code">{codigoLegible(e.codigo)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { EntradaPublica, ResultadoAcceso } from '../data/tipos';
import { codigoLegible, etiquetaEntrada } from '../utils/entradas';
import { fechaHoraCorta } from '../utils/formato';
import './acceso.css';

/**
 * Control de acceso en la puerta (/acceso). Funciona en el navegador del teléfono:
 * escanea el QR, registra el ingreso al instante y muestra el resultado a pantalla completa.
 * Dos o más teléfonos pueden escanear a la vez: el servidor nunca registra dos veces la misma entrada.
 */

async function api<T>(ruta: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api/acceso/${ruta}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(j?.error ?? `Error ${r.status}`), { status: r.status });
  return j as T;
}

type Lector = (v: HTMLVideoElement) => Promise<string | null>;

/** BarcodeDetector nativo (Android) o jsQR (iPhone y el resto), cargado solo aquí. */
async function crearLector(): Promise<Lector> {
  const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (BD) {
    const d = new BD({ formats: ['qr_code'] });
    return async (v) => (await d.detect(v))[0]?.rawValue ?? null;
  }
  const jsQR = (await import('jsqr')).default;
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true })!;
  return async (v) => {
    const lado = Math.min(v.videoWidth, v.videoHeight, 720);
    if (!lado) return null;
    c.width = c.height = lado;
    g.drawImage(v, (v.videoWidth - lado) / 2, (v.videoHeight - lado) / 2, lado, lado, 0, 0, lado, lado);
    return jsQR(g.getImageData(0, 0, lado, lado).data, lado, lado, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

function Login({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('login', { pin });
      onOk();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible ingresar');
      setPin('');
    }
  }
  return (
    <main className="pta pta--login">
      <form className="pta-login" onSubmit={entrar}>
        <p className="pta-eyebrow">CUNOC · 2026</p>
        <h1>Control de acceso</h1>
        <label>
          <span>PIN de la puerta</span>
          <input inputMode="numeric" autoComplete="one-time-code" type="password" required value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        </label>
        {error && <p className="pta-error" role="alert">{error}</p>}
        <button className="pta-btn pta-btn--gold">Ingresar</button>
      </form>
    </main>
  );
}

const TITULOS: Record<ResultadoAcceso['estado'], string> = {
  ok: 'Acceso válido',
  usado: 'Entrada ya utilizada',
  invalido: 'Código no válido',
  deshecho: 'Ingreso anulado',
};

function Resultado({ r, onSiguiente, onDeshacer }: { r: ResultadoAcceso; onSiguiente: () => void; onDeshacer: () => void }) {
  const e = r.entrada;
  return (
    <div className={`pta-result pta-result--${r.estado}`} role="alert">
      <div className="pta-result__icon" aria-hidden="true">
        {r.estado === 'ok' ? '✓' : r.estado === 'usado' ? '!' : r.estado === 'deshecho' ? '↺' : '✕'}
      </div>
      <h2>{TITULOS[r.estado]}</h2>
      {e ? (
        <>
          <p className="pta-result__type">{etiquetaEntrada(e.numero, e.acompanantes)}</p>
          <p className="pta-result__name">{e.numero === 0 ? e.nombre : `Invitado de ${e.nombre}`}</p>
          <dl className="pta-result__facts">
            {e.carne && (
              <div>
                <dt>Carné</dt>
                <dd>{e.carne}</dd>
              </div>
            )}
            {e.grupo && (
              <div>
                <dt>Grupo</dt>
                <dd>{e.grupo}</dd>
              </div>
            )}
            <div>
              <dt>Acompañantes permitidos</dt>
              <dd>{e.acompanantes}</dd>
            </div>
            <div>
              <dt>Ingresados del grupo</dt>
              <dd>
                {e.ingresados} de {e.acompanantes + 1}
              </dd>
            </div>
          </dl>
          {r.estado === 'usado' && e.ingreso && <p className="pta-result__when">Ingresó: {fechaHoraCorta(e.ingreso)}</p>}
          <p className="pta-result__code">{codigoLegible(e.codigo)}</p>
        </>
      ) : (
        <p className="pta-result__name">Este código no corresponde a ninguna entrada.</p>
      )}
      <div className="pta-result__actions">
        <button className="pta-btn pta-btn--light" onClick={onSiguiente} autoFocus>
          Escanear siguiente
        </button>
        {r.estado === 'ok' && (
          <button className="pta-btn pta-btn--ghost" onClick={onDeshacer}>
            Deshacer ingreso
          </button>
        )}
      </div>
    </div>
  );
}

interface Fila {
  id: number;
  nombre: string;
  carne: string | null;
  grupo: number | null;
  acompanantes: number;
  entradas: EntradaPublica[];
}

function Buscar({ onRegistrar }: { onRegistrar: (codigo: string) => void }) {
  const [q, setQ] = useState('');
  const [filas, setFilas] = useState<Fila[]>([]);
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) return setFilas([]);
    const t = setTimeout(() => api<Fila[]>(`buscar?q=${encodeURIComponent(q.trim())}`).then(setFilas).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="pta-search">
      <form
        className="pta-manual"
        onSubmit={(e) => {
          e.preventDefault();
          if (codigo.trim()) onRegistrar(codigo);
          setCodigo('');
        }}
      >
        <label>
          <span>Código escrito a mano</span>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" autoCapitalize="characters" autoComplete="off" />
        </label>
        <button className="pta-btn pta-btn--gold">Validar</button>
      </form>

      <label className="pta-manual">
        <span>Buscar por nombre o carné</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. Escobar o 2018…" />
      </label>
      <ul className="pta-list">
        {filas.map((f) => (
          <li key={f.id}>
            <p>
              <strong>{f.nombre}</strong>
              <span>
                {f.carne ?? 'Sin carné'}
                {f.grupo ? ` · Grupo ${f.grupo}` : ''} · {f.acompanantes} acompañante(s)
              </span>
            </p>
            <ul>
              {f.entradas.map((e) => (
                <li key={e.codigo}>
                  <span>{etiquetaEntrada(e.numero, f.acompanantes)}</span>
                  {e.ingreso ? (
                    <em>Ingresó {fechaHoraCorta(e.ingreso)}</em>
                  ) : (
                    <button className="pta-btn pta-btn--small" onClick={() => onRegistrar(e.codigo)}>
                      Registrar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AccesoApp() {
  const [sesion, setSesion] = useState<'cargando' | 'no' | 'si'>('cargando');
  const [vista, setVista] = useState<'camara' | 'buscar'>('camara');
  const [resumen, setResumen] = useState({ total: 0, ingresados: 0 });
  const [resultado, setResultado] = useState<ResultadoAcceso | null>(null);
  const [errorCamara, setErrorCamara] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const pausado = useRef(false);

  const actualizar = useCallback(
    () =>
      api<typeof resumen>('resumen')
        .then((r) => (setResumen(r), setSesion('si')))
        .catch((e) => e.status === 401 && setSesion('no')),
    [],
  );

  useEffect(() => {
    document.title = 'Control de acceso · CUNOC';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.append(meta);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#071f3d');
    actualizar();
    const t = setInterval(actualizar, 20000); // refleja lo que registra la otra persona en la puerta
    return () => clearInterval(t);
  }, [actualizar]);

  const registrar = useCallback(
    async (codigo: string) => {
      pausado.current = true;
      setOcupado(true);
      try {
        const r = await api<ResultadoAcceso>('ingreso', { codigo });
        navigator.vibrate?.(r.estado === 'ok' ? 80 : [60, 80, 60, 80, 160]);
        setResultado(r);
        actualizar();
      } catch (e) {
        if ((e as { status?: number }).status === 401) setSesion('no');
        else setResultado({ estado: 'invalido', entrada: null });
      } finally {
        setOcupado(false);
      }
    },
    [actualizar],
  );

  // Si el QR se escaneó con la cámara del teléfono, llega como /acceso?c=CODIGO.
  useEffect(() => {
    if (sesion !== 'si') return;
    const c = new URLSearchParams(location.search).get('c');
    if (c) {
      history.replaceState(null, '', '/acceso');
      registrar(c);
    }
  }, [sesion, registrar]);

  // Cámara y lectura continua.
  useEffect(() => {
    if (sesion !== 'si' || vista !== 'camara') return;
    let stream: MediaStream | undefined;
    let vivo = true;
    let ultimo = '';
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (!vivo || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const leer = await crearLector();
        setErrorCamara('');
        while (vivo) {
          if (!pausado.current && video.current?.readyState === 4) {
            const valor = await leer(video.current).catch(() => null);
            if (valor && valor !== ultimo) {
              ultimo = valor;
              setTimeout(() => (ultimo = ''), 3000);
              await registrar(valor);
            }
          }
          await new Promise((r) => setTimeout(r, 180));
        }
      } catch {
        setErrorCamara('No se pudo abrir la cámara. Autorice el acceso a la cámara o use «Buscar / código».');
      }
    })();
    return () => {
      vivo = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [sesion, vista, registrar]);

  if (sesion === 'cargando') return <main className="pta" aria-busy="true" />;
  if (sesion === 'no') return <Login onOk={actualizar} />;

  const pct = resumen.total ? Math.round((resumen.ingresados / resumen.total) * 100) : 0;

  return (
    <main className="pta">
      <header className="pta-head">
        <div>
          <p className="pta-eyebrow">Control de acceso</p>
          <p className="pta-count">
            <strong>{resumen.ingresados}</strong> de {resumen.total} ingresados
          </p>
        </div>
        <div className="pta-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <nav className="pta-tabs">
          <button className={vista === 'camara' ? 'is-active' : ''} onClick={() => setVista('camara')}>
            Escanear
          </button>
          <button className={vista === 'buscar' ? 'is-active' : ''} onClick={() => setVista('buscar')}>
            Buscar / código
          </button>
        </nav>
      </header>

      {vista === 'camara' ? (
        <section className="pta-cam">
          <video ref={video} playsInline muted aria-label="Vista de la cámara" />
          <div className="pta-cam__frame" aria-hidden="true" />
          <p className="pta-cam__hint">{errorCamara || (ocupado ? 'Validando…' : 'Apunte al código QR de la entrada')}</p>
        </section>
      ) : (
        <Buscar onRegistrar={registrar} />
      )}

      {resultado && (
        <Resultado
          r={resultado}
          onSiguiente={() => {
            setResultado(null);
            pausado.current = false;
          }}
          onDeshacer={async () => {
            if (!resultado.entrada) return;
            setResultado(await api<ResultadoAcceso>('deshacer', { codigo: resultado.entrada.codigo }));
            actualizar();
          }}
        />
      )}
    </main>
  );
}

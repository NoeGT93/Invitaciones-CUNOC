import { useEffect, useState, type FormEvent } from 'react';
import './admin.css';
import { api, ApiError } from './api';
import { EventoForm } from './EventoForm';
import { Invitados } from './Invitados';
import { Logos } from './Logos';
import { Maestrantes } from './Maestrantes';

const SECCIONES = [
  { id: 'invitados', nombre: 'Invitados' },
  { id: 'maestrantes', nombre: 'Maestrantes' },
  { id: 'evento', nombre: 'Evento' },
  { id: 'logos', nombre: 'Logotipos' },
] as const;
type Seccion = (typeof SECCIONES)[number]['id'];

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api('login', { body: { password } });
      onOk();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible ingresar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="adm-login">
      <form className="adm-login__card" onSubmit={entrar}>
        <p className="adm-eyebrow">Invitaciones · CUNOC 2026</p>
        <h1>Panel de administración</h1>
        <label className="adm-field">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-btn adm-btn--primary" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}

export default function AdminApp() {
  const [sesion, setSesion] = useState<'cargando' | 'no' | 'si'>('cargando');
  const [seccion, setSeccion] = useState<Seccion>(() => {
    const h = location.hash.slice(1) as Seccion;
    return SECCIONES.some((s) => s.id === h) ? h : 'invitados';
  });

  useEffect(() => {
    document.title = 'Panel · Invitaciones CUNOC';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.append(robots);
    api('sesion')
      .then(() => setSesion('si'))
      .catch(() => setSesion('no'));
  }, []);

  useEffect(() => {
    history.replaceState(null, '', `#${seccion}`);
  }, [seccion]);

  /** Si la sesión expira en cualquier vista, vuelve al acceso. */
  const alError = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) setSesion('no');
  };

  if (sesion === 'cargando') return <main className="adm-login" aria-busy="true" />;
  if (sesion === 'no') return <Login onOk={() => setSesion('si')} />;

  return (
    <div className="adm">
      <header className="adm-header">
        <div className="adm-header__brand">
          <span className="adm-eyebrow">CUNOC · 2026</span>
          <strong>Invitaciones</strong>
        </div>
        <nav className="adm-tabs" aria-label="Secciones del panel">
          {SECCIONES.map((s) => (
            <button key={s.id} className={seccion === s.id ? 'is-active' : ''} aria-current={seccion === s.id ? 'page' : undefined} onClick={() => setSeccion(s.id)}>
              {s.nombre}
            </button>
          ))}
        </nav>
        <div className="adm-header__actions">
          <a className="adm-link" href="/" target="_blank" rel="noopener">
            Ver invitación ↗
          </a>
          <button className="adm-link" onClick={() => api('logout', { method: 'POST' }).finally(() => setSesion('no'))}>
            Salir
          </button>
        </div>
      </header>
      <main className="adm-main">
        {seccion === 'invitados' && <Invitados onError={alError} />}
        {seccion === 'maestrantes' && <Maestrantes onError={alError} />}
        {seccion === 'evento' && <EventoForm onError={alError} />}
        {seccion === 'logos' && <Logos onError={alError} />}
      </main>
    </div>
  );
}

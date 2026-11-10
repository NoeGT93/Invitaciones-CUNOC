/**
 * Worker de la invitación.
 *  Público:  GET  /api/invitacion?slug=&de=   POST /api/visita   POST /api/rsvp
 *            POST /api/entradas/consultar|generar {carne}   GET /evento.ics   GET /media/logo/:id
 *  Puerta:   /api/acceso/*  (PIN definido en el panel)
 *  Panel:    /api/admin/*   (contraseña en el secreto ADMIN_PASSWORD)
 * Todo lo demás lo sirven los Static Assets (SPA).
 */
import { agendaPorDefecto, type BloqueAgenda } from '../src/data/agenda';
import { eventoPorDefecto, type Evento } from '../src/data/evento';
import {
  CAMPOS_EDITABLES,
  type DatosInvitacion,
  type EntradaPublica,
  type EstadoRsvp,
  type Logo,
  type ResultadoAcceso,
} from '../src/data/tipos';
import { crearIcs } from '../src/utils/calendar';
import { slugify } from '../src/utils/slugs';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

async function cuerpo(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('Content-Type')?.includes('application/json')) throw new HttpError(415, 'Se esperaba JSON');
  try {
    const b = await req.json();
    if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
  } catch {
    /* cae al error */
  }
  throw new HttpError(400, 'JSON inválido');
}

/** Texto opcional recortado; `null` si viene vacío. */
function texto(v: unknown, max: number, campo: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new HttpError(400, `${campo}: debe ser texto`);
  const t = v.trim();
  if (t.length > max) throw new HttpError(400, `${campo}: máximo ${max} caracteres`);
  return t || null;
}

function requerido(v: unknown, max: number, campo: string): string {
  const t = texto(v, max, campo);
  if (!t) throw new HttpError(400, `${campo} es obligatorio`);
  return t;
}

function entero(v: unknown, campo: string, max = 9999): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new HttpError(400, `${campo}: número inválido`);
  return n;
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I/L
const aleatorio = (n: number, alfabeto = ALFABETO) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => alfabeto[x % alfabeto.length]).join('');
const sufijo = () => aleatorio(4, 'abcdefghjkmnpqrstuvwxyz23456789');

const AHORA = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";
/** Carné sin espacios, guiones ni puntos. */
const normalizarCarne = (v: unknown) => (typeof v === 'string' ? v.replace(/[\s.\-]/g, '').toUpperCase() : '');
/** Código QR o manual: acepta la URL completa, con o sin guion. */
const normalizarCodigo = (v: unknown) => {
  const s = typeof v === 'string' ? v : '';
  const c = s.match(/[?&]c=([A-Za-z0-9-]+)/)?.[1] ?? s;
  return c.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
};

/** Límite genérico por IP (acceso al panel, PIN de puerta, consultas de carné). */
async function limitar(db: D1Database, clave: string, max: number) {
  const ventana = Date.now() - 15 * 60 * 1000;
  const { n } = (await db.prepare('SELECT COUNT(*) AS n FROM login_intentos WHERE ip = ? AND ts > ?').bind(clave, ventana).first<{ n: number }>())!;
  if (n >= max) throw new HttpError(429, 'Demasiados intentos. Espere 15 minutos.');
}
const registrarIntento = (db: D1Database, clave: string) =>
  db.batch([
    db.prepare('INSERT INTO login_intentos (ip, ts) VALUES (?, ?)').bind(clave, Date.now()),
    db.prepare('DELETE FROM login_intentos WHERE ts < ?').bind(Date.now() - 24 * 60 * 60 * 1000),
  ]);

// ─────────────────────────── Configuración ───────────────────────────

async function leerConfig<T>(db: D1Database, clave: string): Promise<T | null> {
  const fila = await db.prepare('SELECT valor FROM config WHERE clave = ?').bind(clave).first<{ valor: string }>();
  return fila ? (JSON.parse(fila.valor) as T) : null;
}

const guardarConfig = (db: D1Database, clave: string, valor: unknown) =>
  db
    .prepare('INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor')
    .bind(clave, JSON.stringify(valor))
    .run();

async function leerEvento(db: D1Database): Promise<Evento> {
  const guardado = (await leerConfig<Partial<Evento>>(db, 'evento')) ?? {};
  return { ...eventoPorDefecto, ...guardado, mensaje: { ...eventoPorDefecto.mensaje, ...guardado.mensaje } };
}

const leerAgenda = async (db: D1Database) => (await leerConfig<BloqueAgenda[]>(db, 'agenda')) ?? agendaPorDefecto;

function validarEvento(b: Record<string, unknown>) {
  const r: Record<string, unknown> = {};
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const k of CAMPOS_EDITABLES) {
    if (!(k in b)) continue;
    const v = b[k];
    switch (k) {
      case 'fecha':
        if (typeof v !== 'string' || !fecha.test(v)) throw new HttpError(400, 'Fecha inválida');
        r[k] = v;
        break;
      case 'rsvpFechaLimite':
        if (v && (typeof v !== 'string' || !fecha.test(v))) throw new HttpError(400, 'Fecha límite inválida');
        r[k] = v || null; // null borra el valor guardado
        break;
      case 'horaInicio':
        if (typeof v !== 'string' || !hora.test(v)) throw new HttpError(400, 'Hora de inicio inválida');
        r[k] = v;
        break;
      case 'horaFin':
        if (v && (typeof v !== 'string' || !hora.test(v))) throw new HttpError(400, 'Hora de finalización inválida');
        r[k] = v || null;
        break;
      case 'lugar':
      case 'ciudad':
        r[k] = requerido(v, 120, k);
        break;
      case 'direccion':
        r[k] = texto(v, 200, 'Dirección');
        break;
      case 'mapsUrl': {
        const u = texto(v, 500, 'URL de Google Maps');
        if (u && !/^https:\/\//.test(u)) throw new HttpError(400, 'La URL de Google Maps debe iniciar con https://');
        r[k] = u;
        break;
      }
      case 'rsvpActivo':
      case 'entradasActivas':
        r[k] = v === true;
        break;
      case 'mensaje': {
        const m = (v ?? {}) as Record<string, unknown>;
        const cuerpoTxt = Array.isArray(m.cuerpo) ? m.cuerpo : [];
        r[k] = {
          aperturaGeneral: requerido(m.aperturaGeneral, 600, 'Párrafo de apertura'),
          cuerpo: cuerpoTxt.map((p, i) => requerido(p, 600, `Párrafo ${i + 2}`)).slice(0, 4),
          cierre: requerido(m.cierre, 160, 'Frase de cierre'),
        };
        break;
      }
    }
  }
  return r;
}

/** Valida la agenda completa enviada desde el panel. */
function validarAgenda(v: unknown): BloqueAgenda[] {
  if (!Array.isArray(v) || v.length > 6) throw new HttpError(400, 'Agenda inválida');
  const hora = (h: unknown, campo: string) => {
    if (h === undefined || h === null || h === '') return undefined;
    if (typeof h !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) throw new HttpError(400, `${campo}: hora inválida`);
    return h;
  };
  const horario = (o: Record<string, unknown> | undefined, campo: string) => {
    const inicio = hora(o?.inicio, campo);
    if (!inicio) return undefined;
    const fin = hora(o?.fin, campo);
    return fin ? { inicio, fin } : { inicio };
  };
  return v.map((b: Record<string, unknown>, i) => {
    const titulo = requerido(b?.titulo, 80, `Sección ${i + 1}`);
    const items = Array.isArray(b.items) ? b.items : [];
    if (items.length > 60) throw new HttpError(400, `${titulo}: demasiados puntos`);
    return {
      id: slugify(String(b.id ?? titulo)).slice(0, 40) || `bloque-${i + 1}`,
      titulo,
      leyenda: texto(b.leyenda, 120, 'Leyenda') ?? undefined,
      items: items.map((it: Record<string, unknown>, j) => {
        const campo = `${titulo}, punto ${j + 1}`;
        const part = Array.isArray(it.participaciones) ? it.participaciones : [];
        const sub = Array.isArray(it.subitems) ? it.subitems : [];
        return {
          hora: horario(it.hora as Record<string, unknown>, campo),
          titulo: requerido(it.titulo, 160, campo),
          icono: texto(it.icono, 20, `${campo}: ícono`) ?? undefined,
          responsable: texto(it.responsable, 160, `${campo}: responsable`) ?? undefined,
          participaciones: part.length
            ? part.slice(0, 20).map((p: Record<string, unknown>) => ({
                nombre: requerido(p?.nombre, 120, `${campo}: participante`),
                tema: texto(p?.tema, 160, `${campo}: tema`) ?? '',
              }))
            : undefined,
          subitems: sub.length
            ? sub.slice(0, 20).map((s: Record<string, unknown>) => ({
                titulo: requerido(s?.titulo, 120, `${campo}: subpunto`),
                hora: horario(s?.hora as Record<string, unknown>, campo),
              }))
            : undefined,
        };
      }),
    };
  });
}

async function leerLogos(db: D1Database): Promise<Logo[]> {
  const { results } = await db
    .prepare('SELECT id, alt, ancho, alto, actualizado FROM logos ORDER BY orden, id')
    .all<{ id: number; alt: string; ancho: number | null; alto: number | null; actualizado: string }>();
  return results.map((l) => ({
    id: l.id,
    alt: l.alt,
    ancho: l.ancho ?? 200,
    alto: l.alto ?? 200,
    src: `/media/logo/${l.id}?v=${encodeURIComponent(l.actualizado)}`,
  }));
}

// ─────────────────────────── Sesiones (panel y puerta) ───────────────────────────

type Rol = 'adm' | 'pta';
const RUTA_COOKIE: Record<Rol, string> = { adm: '/api/admin', pta: '/api/acceso' };
const DURACION: Record<Rol, number> = { adm: 12 * 60 * 60, pta: 16 * 60 * 60 };

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = async (s: string) => b64url(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function firmar(secreto: string, dato: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(dato)));
}

async function iguales(a: string, b: string) {
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

/** `version` permite invalidar todas las sesiones de puerta al cambiar el PIN. */
async function crearSesion(secreto: string, rol: Rol, version = '') {
  const exp = String(Math.floor(Date.now() / 1000) + DURACION[rol]);
  return `${exp}.${await firmar(secreto, `${rol}:${version}:${exp}`)}`;
}

async function sesionValida(req: Request, secreto: string, rol: Rol, version = '') {
  const m = req.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${rol}=([^;]+)`));
  if (!m) return false;
  const [exp, firma] = m[1].split('.');
  if (!exp || !firma || Number(exp) < Date.now() / 1000) return false;
  return iguales(firma, await firmar(secreto, `${rol}:${version}:${exp}`));
}

const cookie = (rol: Rol, valor: string, maxAge: number) =>
  `${rol}=${valor}; Path=${RUTA_COOKIE[rol]}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

const ipDe = (req: Request) => req.headers.get('CF-Connecting-IP') ?? 'local';

function secretoDe(env: Env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'Falta configurar el secreto ADMIN_PASSWORD');
  return env.ADMIN_PASSWORD;
}

async function login(req: Request, env: Env) {
  const secreto = secretoDe(env);
  const ip = ipDe(req);
  await limitar(env.DB, ip, 10);
  const { password } = await cuerpo(req);
  if (typeof password !== 'string' || !(await iguales(password, secreto))) {
    await registrarIntento(env.DB, ip);
    throw new HttpError(401, 'Contraseña incorrecta');
  }
  await env.DB.prepare('DELETE FROM login_intentos WHERE ip = ?').bind(ip).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie('adm', await crearSesion(secreto, 'adm'), DURACION.adm) });
}

type PinGuardado = { sal: string; hash: string };

// ─────────────────────────── Entradas ───────────────────────────

/** Crea o elimina entradas para que existan 1 + acompañantes. Nunca borra una ya utilizada. */
async function sincronizarEntradas(db: D1Database, maestranteId: number, acompanantes: number) {
  const { results } = await db
    .prepare('SELECT numero, ingreso FROM entradas WHERE maestrante_id = ?')
    .bind(maestranteId)
    .all<{ numero: number; ingreso: string | null }>();
  const usadasDeMas = results.filter((e) => e.numero > acompanantes && e.ingreso);
  if (usadasDeMas.length) throw new HttpError(409, 'No se puede reducir: algunos acompañantes ya ingresaron.');
  const existentes = new Set(results.map((e) => e.numero));
  const ops = [db.prepare('DELETE FROM entradas WHERE maestrante_id = ? AND numero > ?').bind(maestranteId, acompanantes)];
  for (let n = 0; n <= acompanantes; n++) {
    if (!existentes.has(n)) {
      ops.push(db.prepare('INSERT INTO entradas (maestrante_id, numero, codigo) VALUES (?, ?, ?)').bind(maestranteId, n, aleatorio(8)));
    }
  }
  await db.batch(ops);
}

async function entradasDe(db: D1Database, maestranteId: number): Promise<EntradaPublica[]> {
  const { results } = await db
    .prepare('SELECT numero, codigo, ingreso FROM entradas WHERE maestrante_id = ? ORDER BY numero')
    .bind(maestranteId)
    .all<EntradaPublica>();
  return results;
}

type FilaMaestrante = {
  id: number;
  nombre: string;
  grupo: number | null;
  acompanantes: number;
  entradas_generadas: string | null;
  pago: 'pagado' | 'pendiente';
};

/** «PAGADO» / «PENDIENTE…» de la hoja de cuotas → estado; vacío = no cambia. */
function pagoDe(v: unknown): 'pagado' | 'pendiente' | null {
  if (v === undefined || v === null || v === '') return null;
  const t = String(v).trim().toLowerCase();
  if (t.startsWith('pagad')) return 'pagado';
  if (t.startsWith('pendient')) return 'pendiente';
  throw new HttpError(400, `Estado de pago no reconocido: «${v}» (use Pagado o Pendiente)`);
}

/** Busca al maestrante por carné (limitado por IP para impedir probar carnés en serie). */
async function maestrantePorCarne(req: Request, env: Env) {
  const clave = `carne:${ipDe(req)}`;
  // 40 carnés INCORRECTOS por conexión cada 15 min: muchos estudiantes comparten IP (datos móviles,
  // Wi-Fi del campus), así que el límite no debe bloquear a los legítimos; sigue frenando la prueba en serie.
  await limitar(env.DB, clave, 40);
  const evento = await leerEvento(env.DB);
  if (!evento.entradasActivas) throw new HttpError(403, 'La generación de entradas aún no está disponible.');
  const carne = normalizarCarne((await cuerpo(req)).carne);
  if (carne.length < 4 || carne.length > 20) throw new HttpError(400, 'Escriba su número de carné.');
  const m = await env.DB.prepare('SELECT id, nombre, grupo, acompanantes, entradas_generadas, pago FROM maestrantes WHERE carne = ?')
    .bind(carne)
    .first<FilaMaestrante>();
  if (!m) {
    await registrarIntento(env.DB, clave);
    throw new HttpError(404, 'No encontramos ese carné. Verifíquelo o consulte con la Junta Directiva.');
  }
  return m;
}

/** Paso 1: muestra nombre, grupo y acompañantes, sin revelar ningún código. */
async function consultarEntradas(req: Request, env: Env) {
  const m = await maestrantePorCarne(req, env);
  return json({ nombre: m.nombre, grupo: m.grupo, acompanantes: m.acompanantes, generadas: m.entradas_generadas, pago: m.pago });
}

/** Paso 2: tras «Sí, soy yo», entrega los códigos UNA sola vez (atómico). */
async function generarEntradas(req: Request, env: Env) {
  const m = await maestrantePorCarne(req, env);
  // El servidor es quien bloquea: la alerta de la página no basta.
  if (m.pago !== 'pagado') {
    throw new HttpError(402, 'Su pago de la cuota de cierre aparece como pendiente. Comuníquese con la Junta Directiva; en cuanto se registre, podrá generar sus entradas.');
  }
  const r = await env.DB.prepare(
    `UPDATE maestrantes SET entradas_generadas = ${AHORA} WHERE id = ? AND entradas_generadas IS NULL RETURNING entradas_generadas`,
  )
    .bind(m.id)
    .first<{ entradas_generadas: string }>();
  if (!r) {
    throw new HttpError(409, 'Sus entradas ya fueron generadas. Si necesita generarlas de nuevo, solicite a la Junta Directiva que las libere.');
  }
  return json({
    nombre: m.nombre,
    grupo: m.grupo,
    acompanantes: m.acompanantes,
    generadas: r.entradas_generadas,
    entradas: await entradasDe(env.DB, m.id),
  });
}

/** Panel: permite generar de nuevo. Los códigos sin usar cambian, así un PDF anterior deja de servir. */
async function liberarEntradas(db: D1Database, id: number) {
  const { results } = await db.prepare('SELECT id FROM entradas WHERE maestrante_id = ? AND ingreso IS NULL').bind(id).all<{ id: number }>();
  await db.batch([
    ...results.map((e) => db.prepare('UPDATE entradas SET codigo = ? WHERE id = ?').bind(aleatorio(8), e.id)),
    db.prepare('UPDATE maestrantes SET entradas_generadas = NULL WHERE id = ?').bind(id),
  ]);
}

// ─────────────────────────── Puerta (control de acceso) ───────────────────────────

const SQL_ENTRADA = `SELECT e.codigo, e.numero, e.ingreso, m.id AS maestrante_id, m.nombre, m.carne, m.grupo, m.acompanantes,
  (SELECT COUNT(*) FROM entradas x WHERE x.maestrante_id = m.id AND x.ingreso IS NOT NULL) AS ingresados
  FROM entradas e JOIN maestrantes m ON m.id = e.maestrante_id WHERE e.codigo = ?`;

async function resultado(db: D1Database, codigo: string, estado: ResultadoAcceso['estado']): Promise<ResultadoAcceso> {
  const e = await db.prepare(SQL_ENTRADA).bind(codigo).first<NonNullable<ResultadoAcceso['entrada']>>();
  return e ? { estado, entrada: e } : { estado: 'invalido', entrada: null };
}

async function acceso(req: Request, env: Env, ruta: string) {
  const secreto = secretoDe(env);
  const db = env.DB;
  const pin = await leerConfig<PinGuardado>(db, 'pin_acceso');
  const version = pin?.hash.slice(0, 12) ?? '';

  if (ruta === 'login' && req.method === 'POST') {
    if (!pin) throw new HttpError(503, 'El PIN de acceso aún no se ha configurado en el panel.');
    const ip = `pin:${ipDe(req)}`;
    await limitar(db, ip, 10);
    const valor = (await cuerpo(req)).pin;
    if (typeof valor !== 'string' || !(await iguales(await sha256(pin.sal + valor.trim()), pin.hash))) {
      await registrarIntento(db, ip);
      throw new HttpError(401, 'PIN incorrecto');
    }
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('pta', await crearSesion(secreto, 'pta', version), DURACION.pta) });
  }
  if (!pin || !(await sesionValida(req, secreto, 'pta', version))) throw new HttpError(401, 'Sesión de acceso expirada');

  if (ruta === 'resumen') {
    const r = await db
      .prepare('SELECT COUNT(*) AS total, SUM(ingreso IS NOT NULL) AS ingresados FROM entradas')
      .first<{ total: number; ingresados: number | null }>();
    return json({ total: r?.total ?? 0, ingresados: r?.ingresados ?? 0 });
  }

  if (ruta === 'ingreso' && req.method === 'POST') {
    const codigo = normalizarCodigo((await cuerpo(req)).codigo);
    if (!codigo) throw new HttpError(400, 'Código vacío');
    // Atómico: si dos teléfonos escanean a la vez, solo uno registra el ingreso.
    const r = await db.prepare(`UPDATE entradas SET ingreso = ${AHORA} WHERE codigo = ? AND ingreso IS NULL`).bind(codigo).run();
    return json(await resultado(db, codigo, r.meta.changes ? 'ok' : 'usado'));
  }

  if (ruta === 'deshacer' && req.method === 'POST') {
    const codigo = normalizarCodigo((await cuerpo(req)).codigo);
    await db.prepare('UPDATE entradas SET ingreso = NULL WHERE codigo = ?').bind(codigo).run();
    return json(await resultado(db, codigo, 'deshecho'));
  }

  if (ruta === 'buscar') {
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    if (q.length < 2) return json([]);
    const { results } = await db
      .prepare(
        `SELECT id, nombre, carne, grupo, acompanantes FROM maestrantes
         WHERE nombre LIKE ? OR carne LIKE ? ORDER BY nombre LIMIT 15`,
      )
      .bind(`%${q}%`, `%${normalizarCarne(q)}%`)
      .all<{ id: number; nombre: string; carne: string | null; grupo: number | null; acompanantes: number }>();
    return json(await Promise.all(results.map(async (m) => ({ ...m, entradas: await entradasDe(db, m.id) }))));
  }

  throw new HttpError(404, 'Ruta no encontrada');
}

// ─────────────────────────── Rutas públicas ───────────────────────────

async function datosInvitacion(url: URL, env: Env): Promise<DatosInvitacion> {
  const slug = url.searchParams.get('slug')?.toLowerCase();
  const de = url.searchParams.get('de')?.toLowerCase();
  const [evento, agenda, logos, invitado] = await Promise.all([
    leerEvento(env.DB),
    leerAgenda(env.DB),
    leerLogos(env.DB),
    slug
      ? env.DB.prepare(
          'SELECT slug, tratamiento, nombre, cargo, unidad, institucion, mensaje, estado, nota, maestrante_id FROM invitados WHERE slug = ?',
        )
          .bind(slug)
          .first<DatosInvitacion['invitado'] & { maestrante_id: number | null }>()
      : null,
  ]);
  // El maestrante asignado en el panel tiene prioridad; ?de= se mantiene por compatibilidad.
  const maestrante = invitado?.maestrante_id
    ? await env.DB.prepare('SELECT id, slug, nombre, grupo FROM maestrantes WHERE id = ?').bind(invitado.maestrante_id).first()
    : de
      ? await env.DB.prepare('SELECT id, slug, nombre, grupo FROM maestrantes WHERE slug = ?').bind(de).first()
      : null;
  if (invitado) delete (invitado as { maestrante_id?: unknown }).maestrante_id;
  return { evento, agenda, logos, invitado: invitado ?? null, maestrante: (maestrante as DatosInvitacion['maestrante']) ?? null };
}

async function rsvp(req: Request, env: Env) {
  const b = await cuerpo(req);
  const slug = requerido(b.slug, 80, 'slug').toLowerCase();
  const estado = b.estado;
  if (estado !== 'confirmado' && estado !== 'declinado') throw new HttpError(400, 'Respuesta inválida');
  const evento = await leerEvento(env.DB);
  if (!evento.rsvpActivo) throw new HttpError(403, 'La confirmación está cerrada');
  const nota = texto(b.nota, 500, 'Comentario');
  const r = await env.DB.prepare(`UPDATE invitados SET estado = ?, nota = ?, respondido = ${AHORA} WHERE slug = ?`).bind(estado, nota, slug).run();
  if (!r.meta.changes) throw new HttpError(404, 'Invitación no encontrada');
  return json({ ok: true, estado });
}

async function visita(req: Request, env: Env) {
  const slug = requerido((await cuerpo(req)).slug, 80, 'slug').toLowerCase();
  await env.DB.prepare(
    `UPDATE invitados SET visitas = visitas + 1, primera_visita = COALESCE(primera_visita, ${AHORA}), ultima_visita = ${AHORA} WHERE slug = ?`,
  )
    .bind(slug)
    .run();
  return new Response(null, { status: 204 });
}

async function logo(id: string, env: Env) {
  const l = await env.DB.prepare('SELECT tipo, datos FROM logos WHERE id = ?').bind(Number(id) || 0).first<{ tipo: string; datos: ArrayBuffer | number[] }>();
  if (!l) return new Response('No encontrado', { status: 404 });
  const datos = Array.isArray(l.datos) ? new Uint8Array(l.datos) : l.datos;
  return new Response(datos, {
    headers: {
      'Content-Type': l.tipo,
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Un SVG subido nunca puede ejecutar código.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// ─────────────────────────── Panel ───────────────────────────

const TIPOS_LOGO = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
const idDe = (id: string | undefined) => {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Identificador inválido');
  return n;
};

/** Guarda un maestrante (alta o edición) y sincroniza sus entradas. */
async function guardarMaestrante(db: D1Database, b: Record<string, unknown>, id?: number) {
  const nombre = requerido(b.nombre, 120, 'Nombre');
  const grupo = entero(b.grupo, 'Grupo', 99);
  const carne = normalizarCarne(b.carne) || null;
  if (carne && (carne.length < 4 || carne.length > 20)) throw new HttpError(400, `Carné inválido: ${b.carne}`);
  const acompanantes = entero(b.acompanantes, 'Acompañantes', 10) ?? 0;
  const pago = pagoDe(b.pago); // null = conservar el actual (o «pagado» si es nuevo)
  if (carne) {
    const otro = await db.prepare('SELECT id, nombre FROM maestrantes WHERE carne = ? AND id IS NOT ?').bind(carne, id ?? null).first<{ nombre: string }>();
    if (otro) throw new HttpError(409, `El carné ${carne} ya pertenece a ${otro.nombre}`);
  }
  if (id) {
    await sincronizarEntradas(db, id, acompanantes);
    // Si cambió el número de acompañantes, el maestrante puede volver a generar su PDF (mismos códigos + los nuevos).
    await db
      .prepare(
        `UPDATE maestrantes SET nombre = ?, grupo = ?, carne = ?, pago = COALESCE(?, pago),
           entradas_generadas = CASE WHEN acompanantes = ? THEN entradas_generadas ELSE NULL END,
           acompanantes = ? WHERE id = ?`,
      )
      .bind(nombre, grupo, carne, pago, acompanantes, acompanantes, id)
      .run();
    return id;
  }
  let slug = slugify(nombre).slice(0, 40) || 'maestrante';
  if (await db.prepare('SELECT 1 FROM maestrantes WHERE slug = ?').bind(slug).first()) slug = `${slug}-${sufijo()}`;
  const fila = await db
    .prepare('INSERT INTO maestrantes (slug, nombre, grupo, carne, acompanantes, pago) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(slug, nombre, grupo, carne, acompanantes, pago ?? 'pagado')
    .first<{ id: number }>();
  await sincronizarEntradas(db, fila!.id, acompanantes);
  return fila!.id;
}

async function admin(req: Request, env: Env, ruta: string) {
  const m = req.method;
  if (ruta === 'login' && m === 'POST') return login(req, env);
  const secreto = secretoDe(env);
  if (!(await sesionValida(req, secreto, 'adm'))) throw new HttpError(401, 'Sesión expirada');
  if (ruta === 'logout' && m === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookie('adm', '', 0) });
  if (ruta === 'sesion') return json({ ok: true });

  const db = env.DB;
  const [recurso, id, accion] = ruta.split('/');

  if (recurso === 'invitados') {
    if (m === 'GET' && !id) {
      const { results } = await db
        .prepare(
          `SELECT i.*, m.nombre AS maestrante_nombre FROM invitados i
           LEFT JOIN maestrantes m ON m.id = i.maestrante_id ORDER BY i.creado DESC, i.id DESC`,
        )
        .all();
      return json(results);
    }
    if (m === 'DELETE' && id) {
      await db.prepare('DELETE FROM invitados WHERE id = ?').bind(idDe(id)).run();
      return json({ ok: true });
    }
    if (m === 'POST' || m === 'PUT') {
      const b = await cuerpo(req);
      const campos = {
        tratamiento: texto(b.tratamiento, 20, 'Tratamiento'),
        nombre: requerido(b.nombre, 120, 'Nombre'),
        cargo: texto(b.cargo, 160, 'Cargo'),
        unidad: texto(b.unidad, 160, 'Unidad'),
        institucion: texto(b.institucion, 160, 'Institución'),
        mensaje: texto(b.mensaje, 600, 'Mensaje'),
        maestrante_id: entero(b.maestrante_id, 'Maestrante'),
      };
      const estado = b.estado as EstadoRsvp | undefined;
      if (estado && !['pendiente', 'confirmado', 'declinado'].includes(estado)) throw new HttpError(400, 'Estado inválido');

      if (m === 'POST') {
        const slug = `${slugify(campos.nombre).slice(0, 40) || 'invitado'}-${sufijo()}`;
        const fila = await db
          .prepare(
            `INSERT INTO invitados (slug, tratamiento, nombre, cargo, unidad, institucion, mensaje, maestrante_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, slug`,
          )
          .bind(slug, campos.tratamiento, campos.nombre, campos.cargo, campos.unidad, campos.institucion, campos.mensaje, campos.maestrante_id)
          .first();
        return json(fila, 201);
      }
      await db
        .prepare(
          `UPDATE invitados SET tratamiento = ?, nombre = ?, cargo = ?, unidad = ?, institucion = ?, mensaje = ?, maestrante_id = ?,
             estado = COALESCE(?, estado),
             respondido = CASE WHEN ? IS NULL OR ? = estado THEN respondido WHEN ? = 'pendiente' THEN NULL ELSE ${AHORA} END
           WHERE id = ?`,
        )
        .bind(
          campos.tratamiento, campos.nombre, campos.cargo, campos.unidad, campos.institucion, campos.mensaje, campos.maestrante_id,
          estado ?? null, estado ?? null, estado ?? null, estado ?? null, idDe(id),
        )
        .run();
      return json({ ok: true });
    }
  }

  if (recurso === 'maestrantes') {
    if (m === 'GET') {
      const { results } = await db
        .prepare(
          `SELECT m.*, COUNT(e.id) AS entradas, SUM(e.ingreso IS NOT NULL) AS ingresados
           FROM maestrantes m LEFT JOIN entradas e ON e.maestrante_id = m.id
           GROUP BY m.id ORDER BY m.grupo IS NULL, m.grupo, m.nombre`,
        )
        .all();
      return json(results);
    }
    if (m === 'DELETE' && id) {
      await db.prepare('DELETE FROM maestrantes WHERE id = ?').bind(idDe(id)).run();
      return json({ ok: true });
    }
    // Carga masiva desde una hoja de cálculo: [{nombre, carne, grupo, acompanantes}]
    if (m === 'POST' && id === 'importar') {
      const filas = (await cuerpo(req)).filas;
      if (!Array.isArray(filas) || !filas.length || filas.length > 300) throw new HttpError(400, 'Pegue entre 1 y 300 filas');
      let creados = 0;
      let actualizados = 0;
      const errores: string[] = [];
      for (const [i, f] of filas.entries()) {
        try {
          const fila = f as Record<string, unknown>;
          const carne = normalizarCarne(fila.carne);
          // Coincide por carné; si no, por nombre exacto de alguien aún sin carné (evita duplicados).
          const existente =
            (carne ? await db.prepare('SELECT id FROM maestrantes WHERE carne = ?').bind(carne).first<{ id: number }>() : null) ??
            (await db
              .prepare('SELECT id FROM maestrantes WHERE carne IS NULL AND lower(trim(nombre)) = lower(trim(?))')
              .bind(String(fila.nombre ?? ''))
              .first<{ id: number }>());
          await guardarMaestrante(db, f as Record<string, unknown>, existente?.id);
          existente ? actualizados++ : creados++;
        } catch (e) {
          errores.push(`Fila ${i + 1}: ${e instanceof Error ? e.message : 'error'}`);
        }
      }
      return json({ creados, actualizados, errores });
    }
    if (m === 'POST' && id && accion === 'liberar') {
      await liberarEntradas(db, idDe(id));
      return json({ ok: true });
    }
    if (m === 'POST' && id && accion === 'reiniciar') {
      await db.prepare('UPDATE entradas SET ingreso = NULL WHERE maestrante_id = ?').bind(idDe(id)).run();
      return json({ ok: true });
    }
    if (m === 'POST' || m === 'PUT') {
      const nuevo = await guardarMaestrante(db, await cuerpo(req), m === 'PUT' ? idDe(id) : undefined);
      return json({ id: nuevo }, m === 'POST' ? 201 : 200);
    }
  }

  if (recurso === 'entradas') {
    // Lista completa para la puerta (respaldo sin internet): una fila por entrada.
    if (m === 'GET' && !id) {
      const { results } = await db
        .prepare(
          `SELECT m.nombre, m.carne, m.grupo, m.acompanantes, m.pago, e.numero, e.codigo, e.ingreso
           FROM entradas e JOIN maestrantes m ON m.id = e.maestrante_id
           ORDER BY m.grupo IS NULL, m.grupo, m.nombre, e.numero`,
        )
        .all();
      return json(results);
    }
    if (m === 'GET' && id) return json(await entradasDe(db, idDe(id)));
    if (m === 'POST' && id === 'reiniciar') {
      await db.prepare('UPDATE entradas SET ingreso = NULL').run();
      return json({ ok: true });
    }
  }

  if (recurso === 'pin' && m === 'PUT') {
    const pin = String((await cuerpo(req)).pin ?? '').trim();
    if (!/^\d{6,10}$/.test(pin)) throw new HttpError(400, 'El PIN debe tener entre 6 y 10 dígitos');
    const sal = aleatorio(16);
    await guardarConfig(db, 'pin_acceso', { sal, hash: await sha256(sal + pin) } satisfies PinGuardado);
    return json({ ok: true });
  }
  if (recurso === 'pin' && m === 'GET') return json({ configurado: !!(await leerConfig(db, 'pin_acceso')) });

  if (recurso === 'agenda') {
    if (m === 'GET') return json(await leerAgenda(db));
    if (m === 'PUT') {
      const agenda = validarAgenda((await cuerpo(req)).agenda);
      await guardarConfig(db, 'agenda', agenda);
      return json(agenda);
    }
    if (m === 'DELETE') {
      await db.prepare("DELETE FROM config WHERE clave = 'agenda'").run();
      return json(agendaPorDefecto);
    }
  }

  if (recurso === 'evento') {
    if (m === 'GET') return json(await leerEvento(db));
    if (m === 'PUT') {
      const cambios = validarEvento(await cuerpo(req));
      await guardarConfig(db, 'evento', { ...((await leerConfig(db, 'evento')) ?? {}), ...cambios });
      return json(await leerEvento(db));
    }
  }

  if (recurso === 'logos') {
    if (m === 'GET') return json(await leerLogos(db));
    if (m === 'DELETE' && id) {
      await db.prepare('DELETE FROM logos WHERE id = ?').bind(idDe(id)).run();
      return json({ ok: true });
    }
    if (m === 'PUT' && id) {
      const b = await cuerpo(req);
      await db
        .prepare(`UPDATE logos SET alt = ?, orden = ?, actualizado = ${AHORA} WHERE id = ?`)
        .bind(requerido(b.alt, 160, 'Texto alternativo'), entero(b.orden, 'Orden') ?? 0, idDe(id))
        .run();
      return json({ ok: true });
    }
    if (m === 'POST') {
      const form = await req.formData();
      const archivo = form.get('archivo');
      if (!(archivo instanceof File)) throw new HttpError(400, 'Seleccione un archivo');
      if (!TIPOS_LOGO.includes(archivo.type)) throw new HttpError(400, 'Formato no admitido (PNG, SVG, WEBP o JPG)');
      if (archivo.size > 1024 * 1024) throw new HttpError(400, 'El archivo supera 1 MB');
      // Reemplazar la imagen de un logotipo existente (p. ej. tras quitarle el fondo).
      if (id && accion === 'archivo') {
        await db
          .prepare(`UPDATE logos SET tipo = ?, datos = ?, ancho = ?, alto = ?, actualizado = ${AHORA} WHERE id = ?`)
          .bind(archivo.type, await archivo.arrayBuffer(), entero(form.get('ancho'), 'Ancho'), entero(form.get('alto'), 'Alto'), idDe(id))
          .run();
        return json(await leerLogos(db));
      }
      const alt = requerido(form.get('alt'), 160, 'Texto alternativo');
      const { n } = (await db.prepare('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM logos').first<{ n: number }>())!;
      await db
        .prepare('INSERT INTO logos (alt, tipo, datos, ancho, alto, orden) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(alt, archivo.type, await archivo.arrayBuffer(), entero(form.get('ancho'), 'Ancho'), entero(form.get('alto'), 'Alto'), n)
        .run();
      return json(await leerLogos(db), 201);
    }
  }

  throw new HttpError(404, 'Ruta no encontrada');
}

// ─────────────────────────── Entrada ───────────────────────────

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === '/api/invitacion' && req.method === 'GET') return json(await datosInvitacion(url, env));
      if (p === '/api/rsvp' && req.method === 'POST') return await rsvp(req, env);
      if (p === '/api/visita' && req.method === 'POST') return await visita(req, env);
      if (p === '/api/entradas/consultar' && req.method === 'POST') return await consultarEntradas(req, env);
      if (p === '/api/entradas/generar' && req.method === 'POST') return await generarEntradas(req, env);
      if (p.startsWith('/api/acceso/')) return await acceso(req, env, p.slice('/api/acceso/'.length).replace(/\/$/, ''));
      if (p.startsWith('/api/admin/')) return await admin(req, env, p.slice('/api/admin/'.length).replace(/\/$/, ''));
      if (p.startsWith('/media/logo/')) return await logo(p.split('/')[3], env);
      if (p === '/evento.ics') {
        return new Response(crearIcs(await leerEvento(env.DB), url.origin), {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cierre-maestria-cunoc.ics"',
            'Cache-Control': 'no-cache',
          },
        });
      }
      if (p.startsWith('/api/')) throw new HttpError(404, 'Ruta no encontrada');
      return env.ASSETS.fetch(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Error interno' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

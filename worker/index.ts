/**
 * Worker de la invitación.
 *  Público:  GET  /api/invitacion?slug=&de=   POST /api/visita   POST /api/rsvp
 *            GET  /evento.ics                  GET  /media/logo/:id
 *  Panel:    /api/admin/*  (requiere sesión; contraseña en el secreto ADMIN_PASSWORD)
 * Todo lo demás lo sirven los Static Assets (SPA).
 */
import { eventoPorDefecto, type Evento } from '../src/data/evento';
import { CAMPOS_EDITABLES, type DatosInvitacion, type EstadoRsvp, type Logo } from '../src/data/tipos';
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

function entero(v: unknown, campo: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new HttpError(400, `${campo}: número inválido`);
  return n;
}

const sufijo = () => {
  const b = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(b, (x) => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
};

// ─────────────────────────── Datos del evento ───────────────────────────

async function leerEvento(db: D1Database): Promise<Evento> {
  const fila = await db.prepare("SELECT valor FROM config WHERE clave = 'evento'").first<{ valor: string }>();
  const guardado = fila ? (JSON.parse(fila.valor) as Partial<Evento>) : {};
  return { ...eventoPorDefecto, ...guardado, mensaje: { ...eventoPorDefecto.mensaje, ...guardado.mensaje } };
}

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
        r[k] = v || null; // null borra el valor guardado
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

// ─────────────────────────── Sesión del panel ───────────────────────────

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function firmar(secreto: string, dato: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(dato)));
}

async function iguales(a: string, b: string) {
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

const DURACION_SESION = 12 * 60 * 60; // 12 h

async function crearSesion(secreto: string) {
  const exp = String(Math.floor(Date.now() / 1000) + DURACION_SESION);
  return `${exp}.${await firmar(secreto, `sesion:${exp}`)}`;
}

async function sesionValida(req: Request, secreto: string) {
  const m = req.headers.get('Cookie')?.match(/(?:^|;\s*)adm=([^;]+)/);
  if (!m) return false;
  const [exp, firma] = m[1].split('.');
  if (!exp || !firma || Number(exp) < Date.now() / 1000) return false;
  return iguales(firma, await firmar(secreto, `sesion:${exp}`));
}

const cookie = (valor: string, maxAge: number) =>
  `adm=${valor}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

async function login(req: Request, env: Env) {
  const secreto = env.ADMIN_PASSWORD;
  if (!secreto) throw new HttpError(503, 'Falta configurar el secreto ADMIN_PASSWORD');
  const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
  const ahora = Date.now();
  const ventana = ahora - 15 * 60 * 1000;
  const { n } = (await env.DB.prepare('SELECT COUNT(*) AS n FROM login_intentos WHERE ip = ? AND ts > ?').bind(ip, ventana).first<{ n: number }>())!;
  if (n >= 10) throw new HttpError(429, 'Demasiados intentos. Espere 15 minutos.');

  const { password } = await cuerpo(req);
  if (typeof password !== 'string' || !(await iguales(password, secreto))) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO login_intentos (ip, ts) VALUES (?, ?)').bind(ip, ahora),
      env.DB.prepare('DELETE FROM login_intentos WHERE ts < ?').bind(ahora - 24 * 60 * 60 * 1000),
    ]);
    throw new HttpError(401, 'Contraseña incorrecta');
  }
  await env.DB.prepare('DELETE FROM login_intentos WHERE ip = ?').bind(ip).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(await crearSesion(secreto), DURACION_SESION) });
}

// ─────────────────────────── Rutas públicas ───────────────────────────

async function datosInvitacion(url: URL, env: Env): Promise<DatosInvitacion> {
  const slug = url.searchParams.get('slug')?.toLowerCase();
  const de = url.searchParams.get('de')?.toLowerCase();
  const [evento, logos, invitado] = await Promise.all([
    leerEvento(env.DB),
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
  return { evento, logos, invitado: invitado ?? null, maestrante: (maestrante as DatosInvitacion['maestrante']) ?? null };
}

async function rsvp(req: Request, env: Env) {
  const b = await cuerpo(req);
  const slug = requerido(b.slug, 80, 'slug').toLowerCase();
  const estado = b.estado;
  if (estado !== 'confirmado' && estado !== 'declinado') throw new HttpError(400, 'Respuesta inválida');
  const evento = await leerEvento(env.DB);
  if (!evento.rsvpActivo) throw new HttpError(403, 'La confirmación está cerrada');
  const nota = texto(b.nota, 500, 'Comentario');
  const r = await env.DB.prepare(
    "UPDATE invitados SET estado = ?, nota = ?, respondido = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE slug = ?",
  )
    .bind(estado, nota, slug)
    .run();
  if (!r.meta.changes) throw new HttpError(404, 'Invitación no encontrada');
  return json({ ok: true, estado });
}

async function visita(req: Request, env: Env) {
  const slug = requerido((await cuerpo(req)).slug, 80, 'slug').toLowerCase();
  await env.DB.prepare(
    `UPDATE invitados SET visitas = visitas + 1,
       primera_visita = COALESCE(primera_visita, strftime('%Y-%m-%dT%H:%M:%SZ','now')),
       ultima_visita = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE slug = ?`,
  )
    .bind(slug)
    .run();
  return new Response(null, { status: 204 });
}

async function logo(id: string, env: Env) {
  const l = await env.DB.prepare('SELECT tipo, datos FROM logos WHERE id = ?').bind(Number(id)).first<{ tipo: string; datos: ArrayBuffer | number[] }>();
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

async function admin(req: Request, env: Env, ruta: string) {
  const m = req.method;
  if (ruta === 'login' && m === 'POST') return login(req, env);
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'Falta configurar el secreto ADMIN_PASSWORD');
  if (!(await sesionValida(req, env.ADMIN_PASSWORD))) throw new HttpError(401, 'Sesión expirada');
  if (ruta === 'logout' && m === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
  if (ruta === 'sesion') return json({ ok: true });

  const db = env.DB;
  const [recurso, id] = ruta.split('/');

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
      await db.prepare('DELETE FROM invitados WHERE id = ?').bind(Number(id)).run();
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
             respondido = CASE WHEN ? IS NULL OR ? = estado THEN respondido WHEN ? = 'pendiente' THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ','now') END
           WHERE id = ?`,
        )
        .bind(
          campos.tratamiento, campos.nombre, campos.cargo, campos.unidad, campos.institucion, campos.mensaje, campos.maestrante_id,
          estado ?? null, estado ?? null, estado ?? null, estado ?? null, Number(id),
        )
        .run();
      return json({ ok: true });
    }
  }

  if (recurso === 'maestrantes') {
    if (m === 'GET') return json((await db.prepare('SELECT * FROM maestrantes ORDER BY grupo, nombre').all()).results);
    if (m === 'DELETE' && id) {
      await db.prepare('DELETE FROM maestrantes WHERE id = ?').bind(Number(id)).run();
      return json({ ok: true });
    }
    if (m === 'POST' || m === 'PUT') {
      const b = await cuerpo(req);
      const nombre = requerido(b.nombre, 120, 'Nombre');
      const grupo = entero(b.grupo, 'Grupo');
      if (m === 'POST') {
        let slug = slugify(nombre).slice(0, 40) || 'maestrante';
        if (await db.prepare('SELECT 1 FROM maestrantes WHERE slug = ?').bind(slug).first()) slug = `${slug}-${sufijo()}`;
        return json(await db.prepare('INSERT INTO maestrantes (slug, nombre, grupo) VALUES (?, ?, ?) RETURNING *').bind(slug, nombre, grupo).first(), 201);
      }
      await db.prepare('UPDATE maestrantes SET nombre = ?, grupo = ? WHERE id = ?').bind(nombre, grupo, Number(id)).run();
      return json({ ok: true });
    }
  }

  if (recurso === 'evento') {
    if (m === 'GET') return json(await leerEvento(db));
    if (m === 'PUT') {
      const cambios = validarEvento(await cuerpo(req));
      const fila = await db.prepare("SELECT valor FROM config WHERE clave = 'evento'").first<{ valor: string }>();
      const valor = JSON.stringify({ ...(fila ? JSON.parse(fila.valor) : {}), ...cambios });
      await db.prepare("INSERT INTO config (clave, valor) VALUES ('evento', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(valor).run();
      return json(await leerEvento(db));
    }
  }

  if (recurso === 'logos') {
    if (m === 'GET') return json(await leerLogos(db));
    if (m === 'DELETE' && id) {
      await db.prepare('DELETE FROM logos WHERE id = ?').bind(Number(id)).run();
      return json({ ok: true });
    }
    if (m === 'PUT' && id) {
      const b = await cuerpo(req);
      await db
        .prepare("UPDATE logos SET alt = ?, orden = ?, actualizado = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?")
        .bind(requerido(b.alt, 160, 'Texto alternativo'), entero(b.orden, 'Orden') ?? 0, Number(id))
        .run();
      return json({ ok: true });
    }
    if (m === 'POST') {
      const form = await req.formData();
      const archivo = form.get('archivo');
      if (!(archivo instanceof File)) throw new HttpError(400, 'Seleccione un archivo');
      if (!TIPOS_LOGO.includes(archivo.type)) throw new HttpError(400, 'Formato no admitido (PNG, SVG, WEBP o JPG)');
      if (archivo.size > 1024 * 1024) throw new HttpError(400, 'El archivo supera 1 MB');
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

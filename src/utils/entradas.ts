import qrcode from 'qrcode-generator';
import type { Evento } from '../data/evento';
import { fechaPartes, horaTexto } from './formato';
import { pdfDeJpegs } from './pdf';

/** Lo que se codifica en el QR: abre el control de acceso si se escanea con la cámara del teléfono. */
export const urlAcceso = (codigo: string) => `${location.origin}/acceso?c=${codigo}`;

/** "K3F9X2MP" → "K3F9-X2MP" (más fácil de dictar o escribir a mano). */
export const codigoLegible = (c: string) => c.replace(/(.{4})(?=.)/g, '$1-');

export const etiquetaEntrada = (numero: number, total: number) =>
  numero === 0 ? 'Maestrante' : `Acompañante ${numero} de ${total}`;

function crearQr(texto: string) {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr;
}

/** Trazo SVG del QR (un solo path: liviano y nítido a cualquier tamaño). */
export function qrSvg(texto: string) {
  const qr = crearQr(texto);
  const n = qr.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return { n, d };
}

interface DatosTicket {
  codigo: string;
  numero: number;
  acompanantes: number;
  nombre: string;
  evento: Evento;
}

/**
 * Dibuja una entrada (1080 × 1350, vertical). Se genera en el teléfono:
 * el servidor nunca crea ni guarda archivos.
 */
async function dibujarTicket({ codigo, numero, acompanantes, nombre, evento }: DatosTicket): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue('--serif').trim() || 'Georgia, serif';
  const sans = css.getPropertyValue('--sans').trim() || 'system-ui, sans-serif';
  const NAVY = '#0B3768';
  const GOLD = '#C9942B';
  const GOLD_TXT = '#8A6116';
  const MUTED = '#4C5D74';

  g.fillStyle = '#FCFBF8';
  g.fillRect(0, 0, W, H);
  // Marco doble, como la invitación.
  g.strokeStyle = 'rgba(201,148,43,.45)';
  g.lineWidth = 2;
  g.strokeRect(28, 28, W - 56, H - 56);
  g.strokeStyle = 'rgba(16,42,76,.14)';
  g.strokeRect(40, 40, W - 80, H - 80);

  const centro = (txt: string, y: number, font: string, color: string, espaciado = 0) => {
    g.font = font;
    g.fillStyle = color;
    g.textAlign = 'center';
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${espaciado}px`;
    g.fillText(txt, W / 2, y, W - 160);
  };

  centro('UNIVERSIDAD DE SAN CARLOS DE GUATEMALA', 128, `600 22px ${sans}`, NAVY, 5);
  centro('CENTRO UNIVERSITARIO DE OCCIDENTE · CUNOC', 166, `500 20px ${sans}`, MUTED, 4);
  g.fillStyle = GOLD;
  g.fillRect(W / 2 - 50, 204, 100, 2);
  centro('ENTRADA', 262, `700 22px ${sans}`, GOLD_TXT, 8);
  centro('Presentación de Seminario', 334, `500 56px ${serif}`, NAVY);
  centro('y Cierre de Maestría', 398, `italic 400 56px ${serif}`, '#124F88');

  // QR
  const { n, d } = qrSvg(urlAcceso(codigo));
  const lado = 470;
  const x0 = (W - lado) / 2;
  const y0 = 450;
  g.fillStyle = '#FFFFFF';
  g.fillRect(x0 - 26, y0 - 26, lado + 52, lado + 52);
  g.strokeStyle = 'rgba(16,42,76,.14)';
  g.strokeRect(x0 - 26, y0 - 26, lado + 52, lado + 52);
  g.save();
  g.translate(x0, y0);
  g.scale(lado / n, lado / n);
  g.fillStyle = '#102A4C';
  g.fill(new Path2D(d));
  g.restore();

  centro(codigoLegible(codigo), 1004, `600 34px ${sans}`, NAVY, 6);
  centro(etiquetaEntrada(numero, acompanantes).toUpperCase(), 1066, `700 22px ${sans}`, GOLD_TXT, 5);
  centro(numero === 0 ? nombre : `Invitado de ${nombre}`, 1116, `500 40px ${serif}`, NAVY);

  const f = fechaPartes(evento.fecha);
  centro(`${f.diaSemana} ${f.larga} · ${horaTexto(evento.horaInicio)}`, 1192, `500 26px ${sans}`, MUTED);
  centro(`${evento.lugar}, ${evento.ciudad}`, 1232, `500 26px ${sans}`, MUTED);
  centro('Válida para una persona y un solo ingreso', 1290, `500 20px ${sans}`, GOLD_TXT, 1);

  return c;
}

const aJpeg = (c: HTMLCanvasElement) =>
  new Promise<Uint8Array>((res, rej) =>
    c.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('No se pudo crear la imagen'))), 'image/jpeg', 0.92),
  );

/** Todas las entradas del maestrante en un solo PDF: una página por persona (15 × 19 cm aprox.). */
export async function entradasPdf(entradas: { codigo: string; numero: number }[], datos: Omit<DatosTicket, 'codigo' | 'numero'>) {
  const hojas = [];
  for (const e of entradas) {
    const c = await dibujarTicket({ ...datos, ...e });
    hojas.push({ datos: await aJpeg(c), ancho: c.width, alto: c.height });
  }
  return pdfDeJpegs(hojas, { w: 432, h: 540 });
}

export function descargar(blob: Blob, nombre: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

import type { Evento } from '../data/evento';

/** Fecha local de Guatemala → marca UTC iCalendar (AAAAMMDDTHHMMSSZ). */
function aUtc(fecha: string, hhmm: string, offset: string) {
  return new Date(`${fecha}T${hhmm}:00${offset}`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escapa texto según RFC 5545 §3.3.11. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Pliega líneas a 75 octetos (RFC 5545 §3.1); Outlook lo exige con textos largos. */
function plegar(linea: string) {
  const bytes = new TextEncoder();
  const out: string[] = [];
  let actual = '';
  for (const ch of linea) {
    if (bytes.encode(actual + ch).length > (out.length ? 74 : 75)) {
      out.push(actual);
      actual = ch;
    } else actual += ch;
  }
  out.push(actual);
  return out.join('\r\n ');
}

/**
 * Genera el .ics del evento. Compatible con Google Calendar, Apple Calendar y Outlook.
 * Si `horaFin` no está confirmada se omite DTEND (RFC 5545: el evento dura hasta su inicio);
 * no se inventa una hora de cierre.
 */
export function crearIcs(e: Evento, urlSitio: string) {
  const ubicacion = [e.lugar, e.direccion, e.ciudad].filter(Boolean).join(', ');
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MMEAG CUNOC//Invitacion//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:cierre-mmeag-${e.fecha}@cunoc`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${aUtc(e.fecha, e.horaInicio, e.offsetUtc)}`,
    ...(e.horaFin ? [`DTEND:${aUtc(e.fecha, e.horaFin, e.offsetUtc)}`] : []),
    `SUMMARY:${esc(e.titulo)}`,
    `DESCRIPTION:${esc(`${e.descripcion}\n\nPrograma: ${urlSitio}/#programa`)}`,
    `LOCATION:${esc(ubicacion)}`,
    `URL:${urlSitio}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lineas.map(plegar).join('\r\n') + '\r\n';
}

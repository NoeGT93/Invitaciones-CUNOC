import type { Evento } from '../data/evento';
import type { Invitado } from '../data/tipos';

export const nombreCompleto = (i: Invitado) => [i.tratamiento, i.nombre].filter(Boolean).join(' ');

/**
 * Primer párrafo de la carta. Mantiene protocolo académico y evita
 * concordancias de género que el dato no garantiza.
 */
export function apertura(mensaje: Evento['mensaje'], i?: Invitado | null) {
  if (!i) return mensaje.aperturaGeneral;
  if (i.mensaje) return i.mensaje;
  const calidad = i.cargo ? `, en su calidad de ${i.cargo},` : '';
  return `Es un honor extenderle${calidad} una cordial invitación para acompañarnos en la Presentación de Seminario y Cierre de Maestría.`;
}

/** Líneas secundarias bajo el nombre, sin repetir la institución si ya va implícita. */
export function lineasCargo(i: Invitado) {
  return [i.cargo, i.unidad, i.unidad ? undefined : i.institucion].filter(Boolean) as string[];
}

/** Texto para compartir por WhatsApp desde el panel. */
export function textoWhatsApp(i: Invitado, url: string) {
  return `${nombreCompleto(i)}:\n\nCon especial aprecio, le compartimos su invitación personal a la Presentación de Seminario y Cierre de Maestría de la Maestría en Marketing Estratégico y Alta Gerencia — CUNOC.\n\n${url}`;
}

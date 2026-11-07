import { mensaje } from '../data/evento';
import type { Invitado } from '../data/invitados';

export const nombreCompleto = (i: Invitado) => [i.tratamiento, i.nombre].filter(Boolean).join(' ');

/**
 * Primer párrafo de la carta. Mantiene protocolo académico y evita
 * concordancias de género que el dato no garantiza.
 */
export function apertura(i?: Invitado) {
  if (!i) return mensaje.aperturaGeneral;
  if (i.mensaje) return i.mensaje;
  const calidad = i.cargo ? `, en su calidad de ${i.cargo},` : '';
  return `Es un honor extenderle${calidad} una cordial invitación para acompañarnos en la Presentación de Seminario y Cierre de Maestría.`;
}

/** Líneas secundarias bajo el nombre, sin repetir la institución si ya va implícita. */
export function lineasCargo(i: Invitado) {
  return [i.cargo, i.unidad, i.unidad ? undefined : i.institucion].filter(Boolean) as string[];
}

/**
 * Maestrantes que extienden la invitación: /invitacion/<invitado>?de=<slug>
 *
 * Agregar aquí la lista completa. No inventar nombres.
 * `grupo` corresponde al grupo de presentación de Seminario (1–8).
 */
export interface Maestrante {
  nombre: string;
  slug: string;
  grupo?: number;
}

export const maestrantes: Maestrante[] = [
  { nombre: 'Noe Jeremías Escobar Bautista', slug: 'noe-escobar', grupo: 1 },
  // { nombre: '…', slug: '…', grupo: 2 },
];

/**
 * Invitados con enlace personalizado: /invitacion/<slug>
 *
 * - `slug`: minúsculas, sin tildes, palabras separadas por guiones. Único.
 * - `tratamiento`: «MSc.», «Dr.», «Dra.», «Lic.», «Licda.», «Ing.»… (opcional).
 * - `cargo`, `unidad`, `institucion`: opcionales; la redacción se adapta.
 * - `mensaje`: opcional; reemplaza por completo el primer párrafo de la carta.
 *
 * No inventar cargos: si no se conoce, dejar el campo fuera.
 */
export interface Invitado {
  slug: string;
  tratamiento?: string;
  nombre: string;
  cargo?: string;
  unidad?: string;
  institucion?: string;
  mensaje?: string;
}

export const invitados: Invitado[] = [
  {
    slug: 'sergio-sum',
    tratamiento: 'MSc.',
    nombre: 'Sergio Sum',
    cargo: 'Coordinador de Maestrías',
    unidad: 'División de Ciencias Económicas',
    institucion: 'Centro Universitario de Occidente – CUNOC',
  },
  {
    slug: 'edgar-camposeco',
    tratamiento: 'Dr.',
    nombre: 'Edgar Camposeco',
    // cargo: pendiente de confirmar.
  },
];

/**
 * URL pública definitiva del sitio, SIN barra final.
 * Se usa para las etiquetas Open Graph (WhatsApp exige URLs absolutas)
 * y para `npm run generar-enlaces`.
 *
 * ⚠️ Actualizar después del primer `npm run deploy` con la URL que entregue
 * Cloudflare (p. ej. https://invitaciones-cunoc.<subdominio>.workers.dev)
 * o con el dominio propio, si se configura uno.
 */
export const URL_SITIO = 'https://invitaciones-cunoc.workers.dev';

/**
 * Logotipos oficiales de la cabecera. Colocar los archivos en /public/logos/.
 * Si cambia la extensión (.svg, .webp), actualizar `src`.
 * `ancho`/`alto` = dimensiones reales del archivo (evitan saltos de diseño;
 * la proporción siempre se respeta con object-fit: contain).
 */
export const LOGOS = [
  { src: '/logos/usac-escudo.png', alt: 'Escudo de la Universidad de San Carlos de Guatemala', ancho: 400, alto: 400 },
  { src: '/logos/cunoc.png', alt: 'Centro Universitario de Occidente – CUNOC', ancho: 400, alto: 400 },
  { src: '/logos/sep-cunoc.png', alt: 'Departamento de Estudios de Postgrado – SEP CUNOC', ancho: 400, alto: 400 },
];

/** Metadatos generales. Nunca contienen datos personales del invitado. */
export const META = {
  titulo: 'Presentación de Seminario y Cierre de Maestría | CUNOC',
  descripcion:
    'Maestría en Marketing Estratégico y Alta Gerencia · 14 de noviembre de 2026 · Quetzaltenango.',
  imagenOg: '/og/og-invitacion.png',
  colorTema: '#0B3768',
};

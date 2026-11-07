/** "Noé Escobar" → "noe-escobar" */
export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const esSlugValido = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);

/** Extrae el slug de /invitacion/<slug> (con o sin barra final). */
export function slugDeRuta(pathname: string) {
  const m = pathname.match(/^\/invitacion\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : undefined;
}

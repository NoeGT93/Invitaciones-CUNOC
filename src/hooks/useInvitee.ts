import { useMemo } from 'react';
import { invitados } from '../data/invitados';
import { maestrantes } from '../data/maestrantes';
import { slugDeRuta } from '../utils/slugs';

/**
 * Resuelve invitado (/invitacion/<slug>) y maestrante (?de=<slug>) desde la URL.
 * Un slug desconocido devuelve `undefined` → invitación institucional genérica.
 */
export function useInvitee() {
  return useMemo(() => {
    const slug = slugDeRuta(window.location.pathname);
    const de = new URLSearchParams(window.location.search).get('de')?.toLowerCase();
    return {
      invitado: slug ? invitados.find((i) => i.slug === slug) : undefined,
      maestrante: de ? maestrantes.find((m) => m.slug === de) : undefined,
    };
  }, []);
}

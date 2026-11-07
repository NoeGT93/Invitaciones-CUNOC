import { createContext, useContext, useEffect, useState } from 'react';
import { agendaPorDefecto } from '../data/agenda';
import { eventoPorDefecto } from '../data/evento';
import type { DatosInvitacion } from '../data/tipos';
import { slugDeRuta } from '../utils/slugs';

const vacio: DatosInvitacion = { evento: eventoPorDefecto, agenda: agendaPorDefecto, logos: [], invitado: null, maestrante: null };

/**
 * Carga evento, logotipos, invitado (/invitacion/<slug>) y maestrante (?de=) desde la API.
 * Si la API falla, la invitación genérica se muestra igual con los valores por defecto.
 */
export function useCargarInvitacion() {
  const [datos, setDatos] = useState<DatosInvitacion>(vacio);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slug = slugDeRuta(location.pathname);
    const q = new URLSearchParams();
    if (slug) q.set('slug', slug);
    const de = params.get('de');
    if (de) q.set('de', de);

    fetch(`/api/invitacion?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: DatosInvitacion) => {
        setDatos(d);
        // Registra la apertura (no cuenta las vistas previas desde el panel).
        if (d.invitado && params.get('vista') !== 'admin') {
          fetch('/api/visita', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: d.invitado.slug }),
            keepalive: true,
          }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setListo(true));
  }, []);

  return { datos, setDatos, listo };
}

export const DatosContext = createContext<DatosInvitacion>(vacio);
export const useDatos = () => useContext(DatosContext);

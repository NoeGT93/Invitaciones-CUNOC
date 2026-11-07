import { useEffect, useState } from 'react';
import { useDatos } from '../hooks/useInvitee';

/** Barra mínima que aparece solo después del hero, para saltar entre secciones. */
export function TopBar() {
  const { evento, invitado } = useDatos();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('inicio');
    if (!hero || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0.05 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  const pendiente = invitado && evento.rsvpActivo && invitado.estado === 'pendiente';

  return (
    <nav className={`topbar${visible ? ' is-visible' : ''}`} aria-label="Secciones" inert={!visible}>
      <a className="topbar__brand" href="#inicio">
        {'CUNOC · 2026'}
      </a>
      <div className="topbar__links">
        <a href="#informacion">Información</a>
        <a href="#programa">Programa</a>
        {pendiente && (
          <a className="topbar__rsvp" href="#confirmacion">
            Confirmar
          </a>
        )}
      </div>
    </nav>
  );
}

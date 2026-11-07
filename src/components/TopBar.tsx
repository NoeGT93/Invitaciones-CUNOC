import { useEffect, useState } from 'react';

/** Barra mínima que aparece solo después del hero, para saltar entre secciones. */
export function TopBar() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('inicio');
    if (!hero || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0.05 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <nav className={`topbar${visible ? ' is-visible' : ''}`} aria-label="Secciones" inert={!visible}>
      <a className="topbar__brand" href="#inicio">
        {'CUNOC · 2026'}
      </a>
      <div className="topbar__links">
        <a href="#informacion">Información</a>
        <a href="#programa">Programa</a>
      </div>
    </nav>
  );
}

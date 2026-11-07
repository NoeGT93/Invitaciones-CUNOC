import { useState } from 'react';
import { LOGOS } from '../data/sitio';

function Logo({ src, alt, ancho, alto }: (typeof LOGOS)[number]) {
  const [falta, setFalta] = useState(false);
  if (falta) {
    // En desarrollo se marca el espacio y el archivo requerido; en producción se omite.
    return import.meta.env.DEV ? (
      <span className="logo logo--pendiente" title={`Falta ${src}`}>
        {src.replace('/logos/', '')}
      </span>
    ) : null;
  }
  return (
    <img className="logo" src={src} alt={alt} width={ancho} height={alto} decoding="async" fetchPriority="high" onError={() => setFalta(true)} />
  );
}

export function HeaderInstitutional() {
  return (
    <header className="logos" aria-label="Instituciones organizadoras">
      {LOGOS.map((l) => (
        <Logo key={l.src} {...l} />
      ))}
    </header>
  );
}

import { useEffect, useState } from 'react';
import { Ornament } from './Ornament';

const MINIMO = 1150; // ms: lo justo para leer la marca sin hacer esperar
const MAXIMO = 2600; // ms: nunca bloquea si la red es lenta

/**
 * Apertura breve: filete dorado y marca; luego el velo se levanta.
 * También cubre la carga de los datos personalizados (sin parpadeo genérico → personalizado).
 */
export function Intro({ listo, onFin }: { listo: boolean; onFin: () => void }) {
  const [minimo, setMinimo] = useState(false);
  const [fase, setFase] = useState<'visible' | 'saliendo' | 'oculto'>(() =>
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 'oculto' : 'visible',
  );

  useEffect(() => {
    if (fase === 'oculto') return onFin();
    const a = setTimeout(() => setMinimo(true), MINIMO);
    const b = setTimeout(() => setFase('saliendo'), MAXIMO);
    return () => (clearTimeout(a), clearTimeout(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fase === 'visible' && listo && minimo) setFase('saliendo');
  }, [listo, minimo, fase]);

  useEffect(() => {
    if (fase !== 'saliendo') return;
    onFin();
    const t = setTimeout(() => setFase('oculto'), 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  if (fase === 'oculto') return null;
  return (
    <div className={`intro${fase === 'saliendo' ? ' is-leaving' : ''}`} aria-hidden="true">
      <div className="intro__mark">
        <p className="intro__eyebrow">Maestría en Marketing Estratégico y Alta Gerencia</p>
        <Ornament className="intro__ornament" />
        <p className="intro__brand">CUNOC · 2026</p>
      </div>
    </div>
  );
}

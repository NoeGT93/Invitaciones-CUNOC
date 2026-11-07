import { useEffect, useRef } from 'react';

/**
 * Reinterpretación de las curvas azul–dorado de la pieza impresa: trazos finos, no franjas.
 * - Nacen y terminan fuera del lienzo (x = -80 … 1520), así llegan de borde a borde en cualquier pantalla.
 * - Ondulan lentamente sin parar; cada línea a su propio ritmo para que el movimiento sea orgánico.
 * - Con «reducir movimiento» activado, quedan quietas.
 */
const ONDAS = [
  {
    clase: 'curves__navy',
    dur: '13s',
    a: 'M-80 120 C 300 40, 640 40, 900 92 S 1330 150, 1520 66',
    b: 'M-80 104 C 330 64, 610 30, 930 84 S 1300 156, 1520 84',
  },
  {
    clase: 'curves__blue',
    dur: '15s',
    a: 'M-80 134 C 320 62, 660 66, 920 108 S 1340 156, 1520 88',
    b: 'M-80 122 C 350 82, 630 50, 950 100 S 1310 158, 1520 106',
  },
  {
    clase: 'curves__gold',
    dur: '17s',
    a: 'M-80 148 C 340 84, 690 92, 940 124 S 1350 158, 1520 110',
    b: 'M-80 138 C 370 102, 660 76, 970 118 S 1320 158, 1520 126',
  },
];

const SUAVE = '0.45 0 0.55 1;0.45 0 0.55 1';

export function Curves({ className = '' }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => (mq.matches ? svg.current?.pauseAnimations() : svg.current?.unpauseAnimations());
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  return (
    <svg ref={svg} className={`curves ${className}`} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {ONDAS.map((o) => (
        <path key={o.clase} className={o.clase} d={o.a}>
          <animate attributeName="d" dur={o.dur} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines={SUAVE} values={`${o.a};${o.b};${o.a}`} />
        </path>
      ))}
    </svg>
  );
}

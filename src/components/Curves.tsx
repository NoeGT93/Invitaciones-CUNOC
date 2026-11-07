/** Reinterpretación de las curvas azul–dorado de la pieza impresa: trazos finos, no franjas. */
export function Curves({ className = '' }: { className?: string }) {
  return (
    <svg className={`curves ${className}`} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="curves__navy" d="M0 118 C 320 40, 640 40, 900 92 S 1300 150, 1440 70" />
      <path className="curves__blue" d="M0 132 C 340 62, 660 66, 920 108 S 1310 160, 1440 92" />
      <path className="curves__gold" d="M0 146 C 360 84, 690 92, 940 124 S 1320 168, 1440 114" />
    </svg>
  );
}

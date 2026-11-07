/** Filete dorado con rombo central: las líneas se dibujan desde el centro. */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <span className={`ornament ${className}`} aria-hidden="true">
      <span className="ornament__line" />
      <span className="ornament__gem" />
      <span className="ornament__line" />
    </span>
  );
}

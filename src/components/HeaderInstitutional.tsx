import { useDatos } from '../hooks/useInvitee';

/** Logotipos subidos desde /admin → Logotipos. Altura fija, proporción original. */
export function HeaderInstitutional() {
  const { logos } = useDatos();
  if (!logos.length) return <div className="logos logos--vacio" aria-hidden="true" />;
  return (
    <header className="logos" aria-label="Instituciones organizadoras">
      {logos.map((l) => (
        <img key={l.id} className="logo" src={l.src} alt={l.alt} width={l.ancho} height={l.alto} decoding="async" fetchPriority="high" />
      ))}
    </header>
  );
}

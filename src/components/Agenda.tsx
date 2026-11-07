import type { BloqueAgenda } from '../data/agenda';
import { useDatos } from '../hooks/useInvitee';
import { AgendaItem } from './AgendaItem';
import { Ornament } from './Ornament';

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Programa editable desde /admin → Agenda.
 * El primer bloque es el acto académico; los siguientes se presentan con
 * la transición celebratoria (fondo cálido, leyenda y numeración ordinal).
 */
export function Agenda() {
  const { agenda } = useDatos();
  const [principal, ...resto] = agenda;
  if (!principal) return null;
  return (
    <section className="agenda" id="programa" aria-labelledby="titulo-programa">
      <div className="container">
        <header className="section-head" data-reveal>
          <p className="eyebrow eyebrow--gold">Programa</p>
          <h2 id="titulo-programa">Agenda del encuentro</h2>
        </header>
        <Bloque bloque={principal} indice={0} />
      </div>

      {resto.map((b, i) => (
        <div key={b.id} className="closing" aria-labelledby={b.id}>
          <div className="container">
            <div className="closing__transition" data-reveal>
              <Ornament />
              {b.leyenda && <p className="closing__legend">{b.leyenda}</p>}
            </div>
            <Bloque bloque={b} indice={i + 1} ordinal />
          </div>
        </div>
      ))}
    </section>
  );
}

function Bloque({ bloque, indice, ordinal }: { bloque: BloqueAgenda; indice: number; ordinal?: boolean }) {
  const sinHoras = bloque.items.every((it) => !it.hora && !it.subitems?.some((s) => s.hora));
  return (
    <div className="block">
      <h3 className="block__title" id={bloque.id} data-reveal>
        <span className="block__num" aria-hidden="true">
          {ROMANOS[indice] ?? indice + 1}
        </span>
        {bloque.titulo}
      </h3>
      {indice === 0 && bloque.leyenda && <p className="block__legend">{bloque.leyenda}</p>}
      <ol className={`tl${ordinal ? ' tl--closing' : ''}`}>
        {bloque.items.map((item, i) => (
          <AgendaItem key={i} item={item} marcador={ordinal && sinHoras ? String(i + 1).padStart(2, '0') : undefined} />
        ))}
      </ol>
    </div>
  );
}

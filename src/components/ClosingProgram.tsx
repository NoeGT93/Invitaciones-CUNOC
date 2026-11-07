import { programaCierre } from '../data/agenda';
import { AgendaItem } from './AgendaItem';

export function ClosingProgram() {
  return (
    <div className="closing" aria-labelledby={programaCierre.id}>
      <div className="container">
        <div className="closing__transition" data-reveal>
          <span className="rule rule--gold rule--grow" aria-hidden="true" />
          {programaCierre.leyenda && <p className="closing__legend">{programaCierre.leyenda}</p>}
        </div>
        <div className="block">
          <h3 className="block__title" id={programaCierre.id} data-reveal>
            <span className="block__num" aria-hidden="true">II</span>
            {programaCierre.titulo}
          </h3>
          <ol className="tl tl--closing">
            {programaCierre.items.map((item, i) => (
              <AgendaItem key={item.titulo} item={item} marcador={String(i + 1).padStart(2, '0')} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

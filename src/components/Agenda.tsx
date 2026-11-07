import { actoAcademico } from '../data/agenda';
import { AgendaItem } from './AgendaItem';
import { ClosingProgram } from './ClosingProgram';

export function Agenda() {
  return (
    <section className="agenda" id="programa" aria-labelledby="titulo-programa">
      <div className="container">
        <header className="section-head" data-reveal>
          <p className="eyebrow eyebrow--gold">Programa</p>
          <h2 id="titulo-programa">Agenda del encuentro</h2>
        </header>

        <div className="block" aria-labelledby={actoAcademico.id}>
          <h3 className="block__title" id={actoAcademico.id} data-reveal>
            <span className="block__num" aria-hidden="true">I</span>
            {actoAcademico.titulo}
          </h3>
          <ol className="tl">
            {actoAcademico.items.map((item) => (
              <AgendaItem key={item.titulo} item={item} />
            ))}
          </ol>
        </div>
      </div>
      <ClosingProgram />
    </section>
  );
}

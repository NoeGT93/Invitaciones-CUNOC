import type { ItemAgenda } from '../data/agenda';
import { hora12, rangoTexto } from '../utils/formato';
import { Icono, iconoDe } from './Icono';

function Hora({ inicio, fin }: { inicio: string; fin?: string }) {
  const sufijo = hora12(fin ?? inicio).sufijo;
  return (
    <time className="tl__time" dateTime={inicio} aria-label={rangoTexto(inicio, fin)}>
      <span>{rangoTexto(inicio, fin).replace(` ${sufijo}`, '')}</span>
      <span className="tl__suffix">{sufijo}</span>
    </time>
  );
}

/** `marcador` sustituye a la hora cuando no existe (p. ej. «01» en el programa de cierre). */
export function AgendaItem({ item, marcador }: { item: ItemAgenda; marcador?: string }) {
  const sub = item.subitems;
  // Rango derivado de los subitems (sin inventar: primera hora y última hora dadas).
  const hora = item.hora ?? (sub?.[0]?.hora && { inicio: sub[0].hora.inicio, fin: sub[sub.length - 1].hora?.fin });

  const icono = iconoDe(item.titulo, item.icono);

  return (
    <li className={`tl__item${hora ? '' : ' tl__item--untimed'}${icono ? ' tl__item--icon' : ''}`} data-reveal>
      <div className="tl__when">{hora ? <Hora {...hora} /> : marcador && <span className="tl__marker">{marcador}</span>}</div>
      {icono ? (
        <span className="tl__badge" aria-hidden="true">
          <Icono nombre={icono} />
        </span>
      ) : (
        <span className="tl__dot" aria-hidden="true" />
      )}
      <div className="tl__body">
        <h4 className="tl__title">{item.titulo}</h4>
        {item.responsable && <p className="tl__who">{item.responsable}</p>}

        {item.participaciones && (
          <ul className="tl__list">
            {item.participaciones.map((p) => (
              <li key={p.nombre}>
                <span className="tl__list-main">{p.nombre}</span>
                <span className="tl__list-aux">{p.tema}</span>
              </li>
            ))}
          </ul>
        )}

        {sub && (
          <ul className="tl__list tl__list--groups">
            {sub.map((s) => (
              <li key={s.titulo}>
                <span className="tl__list-main">{s.titulo}</span>
                {s.hora && <span className="tl__list-aux tl__list-time">{rangoTexto(s.hora.inicio, s.hora.fin)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

# Notas internas — NO se publican

Este archivo no se importa en ningún componente ni se copia a `dist/`.

## Logística (de la hoja de planificación)

- Citar a los maestrantes a las 3:00 p. m.
- Mesa principal para docentes y autoridades.
- Elaborar tickets para la cena.
- Entrega de diapositivas: viernes previo al evento.
- Confirmar quién será Maestro de Ceremonia.
- Mariachis: notas operativas pendientes con el comité.

## Puntos pendientes de confirmar (no se inventaron soluciones)

| Tema | Situación | Dónde se corrige |
| --- | --- | --- |
| Horario de apertura | «Palabras de apertura» ocupa 4:10 – 4:15 con tres intervenciones y tres himnos, pero las presentaciones inician a las 4:15. Los himnos se muestran **sin horario**. | `src/data/agenda.ts` |
| Hora de finalización | No confirmada. El `.ics` se genera sin `DTEND`. | `/admin` → Evento |
| Comentarios finales / Fotografía oficial | Sin horario en la fuente. Se muestran sin hora. | `src/data/agenda.ts` |
| Programa de cierre | Sin horarios en la fuente. Se numeran 01–07 (orden, no hora). | `src/data/agenda.ts` |
| Raúl Bethancourt | Aparece sin título académico, a diferencia de MSc. Sergio Sum y Dr. Edgar Camposeco. Se dejó tal cual. | `src/data/agenda.ts` |
| Mynor Antonio | Podría ser nombre incompleto. Se dejó tal cual. | `src/data/agenda.ts` |
| Cargo del Dr. Edgar Camposeco | Desconocido; su invitación se muestra sin cargo. | `/admin` → Invitados |
| Dirección y Google Maps de Gran Karmel | No proporcionados. El botón «Cómo llegar» queda oculto. | `/admin` → Evento |
| Confirmación de asistencia | Activa desde cada enlace personal; se puede desactivar. | `/admin` → Evento |
| Logotipos oficiales | Pendientes de subir. | `/admin` → Logotipos |

## Criterios de redacción aplicados

- Se usa **maestrantes** de forma consistente.
- La carta pasa a primera persona del plural («tenemos el honor»), para concordar con «nuestra formación».
- «Autoridades universitarias» en minúscula cuando es descriptivo (no nombre propio).
- Horas según la RAE: «4:00 p. m.» (con espacios).

/**
 * Fuente única de la información del evento.
 * Cualquier cambio de fecha, hora o lugar se hace aquí y se refleja en toda
 * la invitación y en el archivo de calendario (.ics).
 */
export interface Evento {
  titulo: string;
  programaAcademico: string;
  institucion: {
    universidad: string;
    centro: string;
    centroCorto: string;
    division: string;
    area: string;
  };
  /** Fecha en formato ISO (AAAA-MM-DD). */
  fecha: string;
  /** Hora de inicio, 24 h (HH:MM), hora de Guatemala. */
  horaInicio: string;
  /** Hora de finalización, 24 h. Dejar `undefined` mientras no esté confirmada. */
  horaFin?: string;
  /** Desfase de Guatemala respecto a UTC (no hay horario de verano). */
  offsetUtc: string;
  lugar: string;
  ciudad: string;
  /** Dirección completa. Opcional: no se muestra si no existe. */
  direccion?: string;
  /** URL de Google Maps. El botón «Cómo llegar» aparece solo si existe. */
  mapsUrl?: string;
  /** Descripción usada en el calendario. */
  descripcion: string;
  /** Confirmación de asistencia. El botón aparece solo si existe. */
  rsvp?: { etiqueta: string; url: string };
  /** Quien firma la invitación. */
  firma: string[];
}

export const evento: Evento = {
  titulo: 'Presentación de Seminario y Cierre de Maestría',
  programaAcademico: 'Maestría en Marketing Estratégico y Alta Gerencia',
  institucion: {
    universidad: 'Universidad de San Carlos de Guatemala',
    centro: 'Centro Universitario de Occidente',
    centroCorto: 'CUNOC',
    division: 'División de Ciencias Económicas',
    area: 'Maestrías',
  },
  fecha: '2026-11-14',
  horaInicio: '16:00',
  horaFin: undefined, // Pendiente de confirmar. No inventar.
  offsetUtc: '-06:00',
  lugar: 'Gran Karmel',
  ciudad: 'Quetzaltenango',
  direccion: undefined, // Pendiente.
  mapsUrl: undefined, // Pendiente: pegar aquí el enlace de Google Maps.
  descripcion:
    'Presentación de Seminario y Cierre de Maestría de los estudiantes de la Maestría en Marketing Estratégico y Alta Gerencia, División de Ciencias Económicas, Centro Universitario de Occidente – CUNOC, Universidad de San Carlos de Guatemala.',
  rsvp: undefined, // Ejemplo: { etiqueta: 'Confirmar asistencia', url: 'https://…' }
  firma: [
    'Junta Directiva de Maestrantes',
    'Maestría en Marketing Estratégico y Alta Gerencia',
    'Centro Universitario de Occidente – CUNOC',
    'Universidad de San Carlos de Guatemala',
  ],
};

/** Textos de la carta. La versión personalizada se arma en `utils/redaccion.ts`. */
export const mensaje = {
  /** Primer párrafo cuando la invitación no está personalizada. */
  aperturaGeneral:
    'Los estudiantes de la Maestría en Marketing Estratégico y Alta Gerencia del Centro Universitario de Occidente tenemos el honor de invitarle a compartir un momento especialmente significativo de nuestra formación académica.',
  cuerpo: [
    'Este encuentro representa la culminación de un proceso de aprendizaje, análisis e intercambio de conocimientos que ha fortalecido nuestras competencias profesionales.',
    'Nos complacerá compartir este momento junto a autoridades universitarias, docentes, invitados y maestrantes.',
  ],
  cierre: 'Será un privilegio contar con su presencia.',
};

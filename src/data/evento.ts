/**
 * Valores por defecto del evento.
 * Los campos marcados como «editables» pueden cambiarse desde /admin → Evento;
 * lo guardado en el panel tiene prioridad sobre estos valores.
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
  /** Editable. Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  /** Editable. Hora de inicio, 24 h (HH:MM), hora de Guatemala. */
  horaInicio: string;
  /** Editable. Hora de finalización, 24 h. Vacía mientras no esté confirmada. */
  horaFin?: string;
  /** Desfase de Guatemala respecto a UTC (no hay horario de verano). */
  offsetUtc: string;
  /** Editable. */
  lugar: string;
  /** Editable. */
  ciudad: string;
  /** Editable. Opcional: no se muestra si está vacía. */
  direccion?: string;
  /** Editable. El botón «Cómo llegar» aparece solo si existe. */
  mapsUrl?: string;
  /** Descripción usada en el calendario. */
  descripcion: string;
  /** Editable. Permite a los invitados confirmar desde su enlace. */
  rsvpActivo: boolean;
  /** Editable. Muestra a los maestrantes el apartado para descargar sus entradas QR. */
  entradasActivas: boolean;
  /** Editable. Fecha ISO sugerida para confirmar (opcional). */
  rsvpFechaLimite?: string;
  /** Editable. Textos de la carta. */
  mensaje: {
    aperturaGeneral: string;
    cuerpo: string[];
    cierre: string;
  };
  /** Quien firma la invitación. */
  firma: string[];
}

export const eventoPorDefecto: Evento = {
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
  direccion: undefined,
  mapsUrl: undefined,
  descripcion:
    'Presentación de Seminario y Cierre de Maestría de los estudiantes de la Maestría en Marketing Estratégico y Alta Gerencia, División de Ciencias Económicas, Centro Universitario de Occidente – CUNOC, Universidad de San Carlos de Guatemala.',
  rsvpActivo: true,
  entradasActivas: true,
  rsvpFechaLimite: undefined,
  mensaje: {
    aperturaGeneral:
      'Los estudiantes de la Maestría en Marketing Estratégico y Alta Gerencia del Centro Universitario de Occidente tenemos el honor de invitarle a compartir un momento especialmente significativo de nuestra formación académica.',
    cuerpo: [
      'Este encuentro representa la culminación de un proceso de aprendizaje, análisis e intercambio de conocimientos que ha fortalecido nuestras competencias profesionales.',
      'Nos complacerá compartir este momento junto a autoridades universitarias, docentes, invitados y maestrantes.',
    ],
    cierre: 'Será un privilegio contar con su presencia.',
  },
  firma: [
    'Junta Directiva de Maestrantes',
    'Maestría en Marketing Estratégico y Alta Gerencia',
    'Centro Universitario de Occidente – CUNOC',
    'Universidad de San Carlos de Guatemala',
  ],
};

/**
 * Programa público del evento. Fuente única para la agenda.
 *
 * Reglas:
 * - Las horas van en formato 24 h ("16:05"). La interfaz las muestra como «4:05 p. m.».
 * - Un elemento sin `hora` se muestra en la secuencia sin asignarle horario.
 * - Las notas logísticas internas NO van aquí (ver docs/NOTAS-INTERNAS.md).
 *
 * ⚠️ Inconsistencia de la fuente original (pendiente de confirmar):
 *   «Palabras de apertura» (4:10 – 4:15) incluye tres intervenciones y luego
 *   la entonación de tres himnos, pero las presentaciones de Seminario inician
 *   a las 4:15. Los himnos se dejan SIN horario hasta que el comité lo defina.
 */
export interface Horario {
  inicio: string;
  fin?: string;
}

export interface Participacion {
  nombre: string;
  tema: string;
}

export interface SubItem {
  hora?: Horario;
  titulo: string;
}

export interface ItemAgenda {
  hora?: Horario;
  titulo: string;
  /** Ícono: vacío = automático según el título; 'ninguno' = sin ícono. */
  icono?: string;
  responsable?: string;
  participaciones?: Participacion[];
  subitems?: SubItem[];
}

export interface BloqueAgenda {
  id: string;
  titulo: string;
  /** Pequeña leyenda que acompaña al título del bloque. */
  leyenda?: string;
  items: ItemAgenda[];
}

const grupo = (n: number, inicio: string, fin: string): SubItem => ({
  hora: { inicio, fin },
  titulo: `Grupo No. ${n}`,
});

export const actoAcademico: BloqueAgenda = {
  id: 'acto-academico',
  titulo: 'Acto académico',
  items: [
    { hora: { inicio: '16:00', fin: '16:05' }, titulo: 'Bienvenida', responsable: 'Maestro de Ceremonia' },
    { hora: { inicio: '16:05', fin: '16:10' }, titulo: 'Oración inicial', responsable: 'Licda. Alejandra Mejía' },
    {
      hora: { inicio: '16:10', fin: '16:15' },
      titulo: 'Palabras de apertura',
      responsable: 'Autoridades universitarias',
      participaciones: [
        { nombre: 'Raúl Bethancourt', tema: 'Objetivo de la actividad' },
        { nombre: 'MSc. Sergio Sum', tema: 'Palabras alusivas al evento' },
        { nombre: 'Dr. Edgar Camposeco', tema: 'Palabras de apertura e inauguración' },
      ],
    },
    // Secuencia ceremonial: sin horario confirmado (ver nota al inicio del archivo).
    { titulo: 'Entonación del Himno Nacional' },
    { titulo: 'Entonación de «Luna de Xelajú»' },
    { titulo: 'Entonación del Himno Universitario' },
    {
      titulo: 'Presentación de informes de Seminario',
      subitems: [
        grupo(1, '16:15', '16:25'),
        grupo(2, '16:25', '16:35'),
        grupo(3, '16:35', '16:45'),
        grupo(4, '16:45', '16:55'),
        grupo(5, '16:55', '17:05'),
        grupo(6, '17:05', '17:15'),
        grupo(7, '17:15', '17:25'),
        grupo(8, '17:25', '17:35'),
      ],
    },
    { hora: { inicio: '17:35', fin: '17:45' }, titulo: 'Preguntas y observaciones' },
    { hora: { inicio: '17:45', fin: '17:55' }, titulo: 'Entrega de reconocimientos a las autoridades', responsable: 'Líderes de grupo' },
    { hora: { inicio: '17:55', fin: '18:00' }, titulo: 'Entrega de reconocimientos a empresarios', responsable: 'Líder de Grupo 1' },
    { hora: { inicio: '18:00', fin: '18:10' }, titulo: 'Entrega de pines a maestrantes', responsable: 'Junta Directiva' },
    {
      hora: { inicio: '18:10', fin: '18:15' },
      titulo: 'Mensaje de agradecimiento en representación de los maestrantes',
      responsable: 'Silvia Rodríguez',
    },
    { titulo: 'Comentarios finales' },
    { titulo: 'Fotografía oficial' },
  ],
};

/** Sin horarios confirmados: se muestran como secuencia. */
export const programaCierre: BloqueAgenda = {
  id: 'programa-cierre',
  titulo: 'Programa de cierre',
  leyenda: 'Al finalizar el acto académico',
  items: [
    { titulo: 'Bienvenida', responsable: 'Maestro de Ceremonia' },
    { titulo: 'Proyección audiovisual', responsable: 'Noe Escobar' },
    { titulo: 'Brindis', responsable: 'Mynor Antonio' },
    { titulo: 'Mariachis' },
    { titulo: 'Pastel' },
    { titulo: 'Cena y convivencia entre maestrantes, docentes y autoridades' },
    { titulo: 'Palabras de agradecimiento', responsable: 'Yeni Macario' },
  ],
};

/** Agenda inicial. Desde el panel (/admin → Agenda) se puede reemplazar por completo. */
export const agendaPorDefecto: BloqueAgenda[] = [actoAcademico, programaCierre];

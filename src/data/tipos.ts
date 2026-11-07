/** Tipos compartidos entre la invitación, el panel y el Worker. */
import type { BloqueAgenda } from './agenda';
import type { Evento } from './evento';

export type EstadoRsvp = 'pendiente' | 'confirmado' | 'declinado';

export interface Invitado {
  slug: string;
  tratamiento?: string | null;
  nombre: string;
  cargo?: string | null;
  unidad?: string | null;
  institucion?: string | null;
  mensaje?: string | null;
}

export interface Maestrante {
  id: number;
  slug: string;
  nombre: string;
  grupo?: number | null;
}

export interface Logo {
  id: number;
  src: string;
  alt: string;
  ancho: number;
  alto: number;
}

/** Respuesta de GET /api/invitacion */
export interface DatosInvitacion {
  evento: Evento;
  agenda: BloqueAgenda[];
  logos: Logo[];
  invitado: (Invitado & { estado: EstadoRsvp; nota?: string | null }) | null;
  maestrante: Maestrante | null;
}

/** Fila del panel de administración. */
export interface InvitadoAdmin extends Invitado {
  id: number;
  maestrante_id: number | null;
  maestrante_nombre: string | null;
  estado: EstadoRsvp;
  nota: string | null;
  respondido: string | null;
  primera_visita: string | null;
  ultima_visita: string | null;
  visitas: number;
  creado: string;
}

/** Campos del evento que se pueden editar desde el panel. */
export const CAMPOS_EDITABLES = [
  'fecha', 'horaInicio', 'horaFin', 'lugar', 'ciudad', 'direccion', 'mapsUrl', 'rsvpActivo', 'entradasActivas', 'rsvpFechaLimite', 'mensaje',
] as const;
export type EventoEditable = Pick<Evento, (typeof CAMPOS_EDITABLES)[number]>;

/** Entrada QR de una persona: numero 0 = maestrante; 1..n = acompañantes. */
export interface EntradaPublica {
  numero: number;
  codigo: string;
  ingreso: string | null;
}

/** Respuesta de POST /api/entradas/consultar */
export interface ConsultaEntradas {
  nombre: string;
  grupo: number | null;
  acompanantes: number;
  /** Fecha en que ya se generaron; null si aún puede generarlas. */
  generadas: string | null;
}

/** Respuesta de POST /api/entradas/generar */
export interface MisEntradas {
  nombre: string;
  grupo: number | null;
  acompanantes: number;
  /** Momento de la generación; identifica la versión vigente de los códigos. */
  generadas?: string;
  entradas: EntradaPublica[];
}

export interface MaestranteAdmin extends Maestrante {
  carne: string | null;
  acompanantes: number;
  entradas_generadas: string | null;
  entradas: number;
  ingresados: number | null;
}

/** Resultado de escanear o registrar una entrada en la puerta. */
export interface ResultadoAcceso {
  estado: 'ok' | 'usado' | 'invalido' | 'deshecho';
  entrada: {
    codigo: string;
    numero: number;
    ingreso: string | null;
    maestrante_id: number;
    nombre: string;
    carne: string | null;
    grupo: number | null;
    acompanantes: number;
    ingresados: number;
  } | null;
}

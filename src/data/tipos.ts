/** Tipos compartidos entre la invitación, el panel y el Worker. */
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
  'fecha', 'horaInicio', 'horaFin', 'lugar', 'ciudad', 'direccion', 'mapsUrl', 'rsvpActivo', 'rsvpFechaLimite', 'mensaje',
] as const;
export type EventoEditable = Pick<Evento, (typeof CAMPOS_EDITABLES)[number]>;

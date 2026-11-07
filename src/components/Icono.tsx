/** Íconos lineales propios (trazo fino, mismo lenguaje que los filetes de la invitación). */
const TRAZOS = {
  microfono: 'M9 3h6v11H9zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  vela: 'M12 3c1.5 1.8 1.5 3.2 0 4.5-1.5-1.3-1.5-2.7 0-4.5zM9 9h6v12H9z',
  musica: 'M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  presentacion: 'M3 4h18v12H3zM12 16v4M8 20h8M7 12l3-3 2 2 4-4',
  pregunta: 'M4 5h16v11H9l-5 4zM10 9a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M12 14.5v.01',
  mensaje: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  reconocimiento: 'M17 9A5 5 0 1 1 7 9a5 5 0 0 1 10 0zM8.5 13 7 21l5-3 5 3-1.5-8',
  pin: 'M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.3l5-.7z',
  foto: 'M4 8h3l2-3h6l2 3h3v11H4zM15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
  proyeccion: 'M3 5h18v14H3zM10 9.5v5l4.5-2.5z',
  brindis: 'M6 3h5l-.5 6a2 2 0 0 1-4 0zM13 3h5l-.5 6a2 2 0 0 1-4 0zM8.5 11v8M15.5 11v8M6.5 19h4M13.5 19h4',
  pastel: 'M4 21h16M5 21v-7h14v7M5 17c2 1 3 1 4.7 0s3.3-1 4.7 0 3 1 4.6 0M12 14v-3M12 8.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5',
  cena: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.7 1-2.5 3-2.5 6v3H16zM16 12v9',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export const ICONOS: { id: NombreIcono; nombre: string }[] = [
  { id: 'microfono', nombre: 'Micrófono' },
  { id: 'vela', nombre: 'Vela' },
  { id: 'musica', nombre: 'Música' },
  { id: 'presentacion', nombre: 'Presentación' },
  { id: 'pregunta', nombre: 'Preguntas' },
  { id: 'mensaje', nombre: 'Mensaje' },
  { id: 'reconocimiento', nombre: 'Reconocimiento' },
  { id: 'pin', nombre: 'Insignia' },
  { id: 'foto', nombre: 'Fotografía' },
  { id: 'proyeccion', nombre: 'Proyección' },
  { id: 'brindis', nombre: 'Brindis' },
  { id: 'pastel', nombre: 'Pastel' },
  { id: 'cena', nombre: 'Cena' },
];

/**
 * Ícono sugerido según el título. Deliberadamente sin ícono para oración,
 * palabras y mensajes: solo donde ayuda a escanear el programa.
 */
const REGLAS: [RegExp, NombreIcono][] = [
  [/bienvenida/, 'microfono'],
  [/himno|entonaci|mariachi/, 'musica'],
  [/presentaci[oó]n de informes|informes de seminario/, 'presentacion'],
  [/pregunta/, 'pregunta'],
  [/reconocimiento/, 'reconocimiento'],
  [/\bpines?\b/, 'pin'],
  [/fotograf/, 'foto'],
  [/proyecci|audiovisual/, 'proyeccion'],
  [/brindis/, 'brindis'],
  [/pastel/, 'pastel'],
  [/\bcena\b/, 'cena'],
];

/** `icono`: undefined = automático; 'ninguno' = sin ícono; o un nombre del conjunto. */
export function iconoDe(titulo: string, icono?: string): NombreIcono | null {
  if (icono === 'ninguno') return null;
  if (icono && icono in TRAZOS) return icono as NombreIcono;
  const t = titulo.toLowerCase();
  return REGLAS.find(([r]) => r.test(t))?.[1] ?? null;
}

export function Icono({ nombre, className = '' }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg className={`icono ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

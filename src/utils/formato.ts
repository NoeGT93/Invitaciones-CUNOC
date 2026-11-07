const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const partes = (iso: string) => iso.split('-').map(Number) as [number, number, number];

/** "16:05" → { h: "4:05", sufijo: "p. m." } — convención de la RAE con espacios. */
export function hora12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  return { h: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, sufijo };
}

export const horaTexto = (hhmm: string) => {
  const { h, sufijo } = hora12(hhmm);
  return `${h} ${sufijo}`;
};

/** "16:00","16:05" → "4:00 – 4:05 p. m." (sufijo una vez si coincide). */
export function rangoTexto(inicio: string, fin?: string) {
  if (!fin) return horaTexto(inicio);
  const a = hora12(inicio);
  const b = hora12(fin);
  return a.sufijo === b.sufijo ? `${a.h} – ${b.h} ${b.sufijo}` : `${horaTexto(inicio)} – ${horaTexto(fin)}`;
}

export function fechaPartes(iso: string) {
  const [y, m, d] = partes(iso);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return {
    diaSemana: dia.charAt(0).toUpperCase() + dia.slice(1),
    larga: `${d} de ${MESES[m - 1]} de ${y}`,
    sinAnio: `${d} de ${MESES[m - 1]}`,
    numerica: `${d} · ${m} · ${y}`,
  };
}

/** Días que faltan para la fecha ISO, según la hora de Guatemala. Negativo si ya pasó. */
export function diasPara(iso: string, offset = '-06:00') {
  const objetivo = new Date(`${iso}T00:00:00${offset}`).getTime();
  const hoyGt = new Date(Date.now() + Number(offset.slice(0, 3)) * 3600_000);
  const hoy = Date.UTC(hoyGt.getUTCFullYear(), hoyGt.getUTCMonth(), hoyGt.getUTCDate()) - Number(offset.slice(0, 3)) * 3600_000;
  return Math.round((objetivo - hoy) / 86_400_000);
}

/** "2026-11-07T01:54:29Z" → "7 nov., 7:54 p. m." en hora de Guatemala (panel). */
export function fechaHoraCorta(isoUtc: string | null) {
  if (!isoUtc) return '';
  return new Date(isoUtc.endsWith('Z') ? isoUtc : `${isoUtc.replace(' ', 'T')}Z`).toLocaleString('es-GT', {
    timeZone: 'America/Guatemala',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

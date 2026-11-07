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

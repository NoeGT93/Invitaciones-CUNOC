/**
 * Genera generated/enlaces-invitaciones.csv con todos los enlaces disponibles:
 *  - un enlace por invitado (sin maestrante), y
 *  - un enlace por cada combinación invitado × maestrante (?de=).
 * Valida slugs (formato y duplicados) antes de escribir.
 *
 * Uso: npm run generar-enlaces
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { invitados } from '../src/data/invitados';
import { maestrantes } from '../src/data/maestrantes';
import { URL_SITIO } from '../src/data/sitio';
import { nombreCompleto } from '../src/utils/redaccion';
import { esSlugValido } from '../src/utils/slugs';

function validar(tipo: string, slugs: string[]) {
  const vistos = new Set<string>();
  for (const s of slugs) {
    if (!esSlugValido(s)) throw new Error(`${tipo}: slug inválido «${s}» (solo a-z, 0-9 y guiones)`);
    if (vistos.has(s)) throw new Error(`${tipo}: slug duplicado «${s}»`);
    vistos.add(s);
  }
}

validar('Invitado', invitados.map((i) => i.slug));
validar('Maestrante', maestrantes.map((m) => m.slug));

const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;
const filas: string[][] = [['Invitado', 'Cargo', 'Maestrante', 'URL personalizada']];

for (const i of invitados) {
  const base = `${URL_SITIO}/invitacion/${i.slug}`;
  filas.push([nombreCompleto(i), i.cargo ?? '', '', base]);
  for (const m of maestrantes) filas.push([nombreCompleto(i), i.cargo ?? '', m.nombre, `${base}?de=${m.slug}`]);
}

mkdirSync('generated', { recursive: true });
// BOM para que Excel abra correctamente tildes y eñes.
writeFileSync('generated/enlaces-invitaciones.csv', '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n') + '\r\n');
console.log(`✓ ${filas.length - 1} enlaces → generated/enlaces-invitaciones.csv`);

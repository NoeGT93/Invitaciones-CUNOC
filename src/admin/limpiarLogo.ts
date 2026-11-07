/**
 * Prepara un logotipo para la cabecera:
 *  1. Vuelve transparente el fondo liso que lo rodea (relleno desde los bordes;
 *     el blanco del interior del escudo no se toca porque no está conectado al borde).
 *  2. Recorta los márgenes vacíos, para que todos los escudos ocupen su espacio por igual.
 * Se ejecuta en el navegador del panel; el servidor solo recibe el PNG final.
 */
const MAX = 480; // px del lado mayor: se muestra a ~108 px, así es nítido en retina y liviano
const TOLERANCIA = 42; // diferencia de color admitida respecto al fondo (0–441)

export async function limpiarLogo(origen: Blob): Promise<{ blob: Blob; ancho: number; alto: number; cambio: boolean }> {
  const bmp = await createImageBitmap(origen);
  const escala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  const px = img.data;

  // Color de fondo: promedio de las cuatro esquinas (si no son parecidas, no se quita fondo).
  const esquinas = [0, w - 1, (h - 1) * w, h * w - 1].map((i) => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2], px[i * 4 + 3]]);
  const ref = [0, 1, 2].map((k) => esquinas.reduce((s, e) => s + e[k], 0) / 4);
  const dist = (i: number) => Math.hypot(px[i] - ref[0], px[i + 1] - ref[1], px[i + 2] - ref[2]);
  const fondoUniforme = esquinas.every((e) => e[3] > 200 && Math.hypot(e[0] - ref[0], e[1] - ref[1], e[2] - ref[2]) < TOLERANCIA);

  let cambio = escala < 1; // reducir un archivo pesado ya es una mejora
  if (fondoUniforme) {
    const visto = new Uint8Array(w * h);
    const pila: number[] = [];
    for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
    while (pila.length) {
      const p = pila.pop()!;
      if (visto[p]) continue;
      visto[p] = 1;
      const d = dist(p * 4);
      if (d > TOLERANCIA * 1.6) continue;
      // Borde suave: transparencia gradual en el anillo de antialiasing.
      px[p * 4 + 3] = d <= TOLERANCIA ? 0 : Math.min(px[p * 4 + 3], Math.round(((d - TOLERANCIA) / (TOLERANCIA * 0.6)) * 255));
      cambio = true;
      if (d > TOLERANCIA) continue; // no avanza más allá del borde del logo
      const x = p % w;
      if (x > 0) pila.push(p - 1);
      if (x < w - 1) pila.push(p + 1);
      if (p >= w) pila.push(p - w);
      if (p < (h - 1) * w) pila.push(p + w);
    }
    g.putImageData(img, 0, 0);
  }

  // Recorte al contenido visible (+1 % de respiro).
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error('La imagen parece estar vacía.');
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.01);
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m);
  y1 = Math.min(h - 1, y1 + m);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  if (cw < w || ch < h) cambio = true;

  const out = Object.assign(document.createElement('canvas'), { width: cw, height: ch });
  out.getContext('2d')!.drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
  const blob = await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/png'));
  return { blob, ancho: cw, alto: ch, cambio };
}

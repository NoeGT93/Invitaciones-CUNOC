/**
 * PDF mínimo con una imagen JPEG a página completa por hoja.
 * Evita una librería de PDF (~350 KB) para algo que cabe en 40 líneas.
 * ponytail: solo imágenes JPEG RGB; si algún día se necesita texto seleccionable, usar jsPDF.
 */
export async function pdfDeJpegs(jpegs: { datos: Uint8Array; ancho: number; alto: number }[], paginaPt: { w: number; h: number }) {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const offsets: number[] = [];
  let largo = 0;
  const escribir = (p: string | Uint8Array) => {
    const b = typeof p === 'string' ? enc.encode(p) : p;
    partes.push(b);
    largo += b.length;
  };
  const objeto = (n: number, cuerpo: string, stream?: Uint8Array) => {
    offsets[n] = largo;
    escribir(`${n} 0 obj\n${cuerpo}\n`);
    if (stream) {
      escribir('stream\n');
      escribir(stream);
      escribir('\nendstream\n');
    }
    escribir('endobj\n');
  };

  // 1: catálogo · 2: páginas · por cada hoja: página, contenido e imagen.
  const n = jpegs.length;
  const pagina = (i: number) => 3 + i * 3;
  escribir('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objeto(2, `<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${pagina(i)} 0 R`).join(' ')}] >>`);
  jpegs.forEach((img, i) => {
    const p = pagina(i);
    const dibujo = enc.encode(`q ${paginaPt.w} 0 0 ${paginaPt.h} 0 0 cm /Im${i} Do Q`);
    objeto(
      p,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paginaPt.w} ${paginaPt.h}] /Resources << /XObject << /Im${i} ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`,
    );
    objeto(p + 1, `<< /Length ${dibujo.length} >>`, dibujo);
    objeto(
      p + 2,
      `<< /Type /XObject /Subtype /Image /Width ${img.ancho} /Height ${img.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.datos.length} >>`,
      img.datos,
    );
  });

  const total = 3 + n * 3;
  const xref = largo;
  escribir(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) escribir(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  escribir(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(partes as BlobPart[], { type: 'application/pdf' });
}

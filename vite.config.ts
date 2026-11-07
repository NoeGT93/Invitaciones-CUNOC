import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { evento } from './src/data/evento';
import { META, URL_SITIO } from './src/data/sitio';
import { crearIcs } from './src/utils/calendar';

/**
 * - Inyecta los metadatos de src/data/sitio.ts en index.html (Open Graph necesita HTML estático).
 * - Publica /evento.ics generado desde src/data/evento.ts. Un archivo real (y no un Blob)
 *   funciona también dentro del navegador integrado de WhatsApp.
 */
function invitacion(): Plugin {
  const reemplazos: Record<string, string> = {
    '%URL_SITIO%': URL_SITIO,
    '%META_TITULO%': META.titulo,
    '%META_DESCRIPCION%': META.descripcion,
    '%META_COLOR%': META.colorTema,
    '%META_IMAGEN%': META.imagenOg,
  };
  return {
    name: 'invitacion',
    transformIndexHtml: (html) => Object.entries(reemplazos).reduce((h, [k, v]) => h.replaceAll(k, v), html),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'evento.ics', source: crearIcs(evento, URL_SITIO) });
    },
    configureServer(server) {
      server.middlewares.use('/evento.ics', (_req, res) => {
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(crearIcs(evento, URL_SITIO));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), invitacion()],
  build: { target: 'es2022', cssMinify: true },
});

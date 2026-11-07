import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { META, URL_SITIO } from './src/data/sitio.ts';

/** Inyecta los metadatos de src/data/sitio.ts en index.html (Open Graph necesita HTML estático). */
function metadatos(): Plugin {
  const reemplazos: Record<string, string> = {
    '%URL_SITIO%': URL_SITIO,
    '%META_TITULO%': META.titulo,
    '%META_DESCRIPCION%': META.descripcion,
    '%META_COLOR%': META.colorTema,
    '%META_IMAGEN%': META.imagenOg,
  };
  return {
    name: 'metadatos',
    transformIndexHtml: (html) => Object.entries(reemplazos).reduce((h, [k, v]) => h.replaceAll(k, v), html),
  };
}

export default defineConfig({
  plugins: [
    react(),
    metadatos(),
    // Ejecuta el Worker y D1 localmente durante `npm run dev`.
    // WRANGLER_PERSIST: ruta corta para el estado local (Windows con rutas largas).
    cloudflare({ persistState: process.env.WRANGLER_PERSIST ? { path: process.env.WRANGLER_PERSIST } : true }),
  ],
  build: { target: 'es2022' },
});

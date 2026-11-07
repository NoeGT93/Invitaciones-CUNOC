# Invitaciones CUNOC

Invitación web personalizada para la **Presentación de Seminario y Cierre de Maestría** de la
Maestría en Marketing Estratégico y Alta Gerencia — División de Ciencias Económicas,
Centro Universitario de Occidente (CUNOC), Universidad de San Carlos de Guatemala.

Sábado 14 de noviembre de 2026 · 4:00 p. m. · Gran Karmel, Quetzaltenango.

**Stack:** React + Vite + TypeScript + CSS, publicado como sitio estático en
**Cloudflare Workers Static Assets** con Wrangler. Sin backend, sin base de datos, sin librerías de animación.

---

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
```

Rutas para probar:

- `/` — invitación institucional genérica
- `/invitacion/sergio-sum` — invitación personalizada
- `/invitacion/sergio-sum?de=noe-escobar` — personalizada y extendida por un maestrante
- `/invitacion/no-existe` — vuelve elegantemente a la versión genérica (nunca un error)

## Build

```bash
npm run build        # verifica tipos y genera dist/
```

## Cloudflare

```bash
npx wrangler login   # solo la primera vez
npm run preview      # build + servidor local de Workers (http://localhost:8787), igual a producción
npm run deploy       # build + wrangler deploy
```

`wrangler.jsonc` publica `./dist` con `not_found_handling = "single-page-application"`:
cualquier ruta como `/invitacion/sergio-sum` devuelve `index.html` (200) y se puede recargar sin 404.

Después del **primer despliegue**, copie la URL que entrega Cloudflare en `URL_SITIO`
(`src/data/sitio.ts`) y vuelva a desplegar. WhatsApp necesita esa URL absoluta para mostrar la vista previa.

> No se usa `@cloudflare/vite-plugin`: el proyecto no tiene código de Worker, solo archivos estáticos,
> y el plugin cambiaría la salida a `dist/client`. `npm run preview` ya ejecuta el runtime real de Workers.

---

## Agregar invitado

Editar **`src/data/invitados.ts`**:

```ts
{
  slug: 'sergio-sum',               // URL: /invitacion/sergio-sum
  tratamiento: 'MSc.',              // opcional
  nombre: 'Sergio Sum',
  cargo: 'Coordinador de Maestrías',// opcional
  unidad: 'División de Ciencias Económicas',     // opcional
  institucion: 'Centro Universitario de Occidente – CUNOC', // opcional
  // mensaje: '…'                   // opcional: reemplaza el primer párrafo
}
```

La redacción se adapta sola: con cargo, «Es un honor extenderle, en su calidad de Coordinador de
Maestrías, una cordial invitación…»; sin cargo, la misma frase sin esa parte.
Slug: minúsculas, sin tildes, palabras separadas por guiones.

## Agregar maestrante

Editar **`src/data/maestrantes.ts`**:

```ts
{ nombre: 'Noe Jeremías Escobar Bautista', slug: 'noe-escobar', grupo: 1 }
```

Con `?de=noe-escobar`, el pie de la invitación indica discretamente quién la extiende.

## Generar enlaces

```bash
npm run generar-enlaces
```

Valida los slugs y crea `generated/enlaces-invitaciones.csv` (columnas: *Invitado, Cargo, Maestrante,
URL personalizada*): un enlace por invitado y uno por cada combinación invitado × maestrante.
El CSV no se versiona en Git porque contiene nombres.

## Modificar agenda

Editar **`src/data/agenda.ts`**. Horas en 24 h (`'16:05'`); la interfaz las muestra como «4:05 p. m.».
Un punto sin `hora` aparece en la secuencia sin horario. Hay una inconsistencia documentada en el
encabezado del archivo y en `docs/NOTAS-INTERNAS.md`.

## Cambiar información del evento

Editar **`src/data/evento.ts`**: título, fecha, hora de inicio, `horaFin`, lugar, dirección,
`mapsUrl` (activa «Cómo llegar»), `rsvp` (activa «Confirmar asistencia»), descripción y firma.
El archivo `/evento.ics` se genera automáticamente desde estos datos en cada build.

Metadatos para WhatsApp / redes: **`src/data/sitio.ts`**.

---

## Logotipos oficiales (pendiente)

Colocar los archivos oficiales en `public/logos/` con estos nombres (o cambiar la ruta en `LOGOS`,
`src/data/sitio.ts`, junto con su ancho y alto reales):

| Archivo | Logotipo |
| --- | --- |
| `public/logos/usac-escudo.png` | Escudo de la Universidad de San Carlos de Guatemala |
| `public/logos/cunoc.png` | Identidad USAC / CUNOC |
| `public/logos/sep-cunoc.png` | Departamento de Estudios de Postgrado – SEP CUNOC |

Se aceptan PNG, SVG o WEBP con fondo transparente. Se muestran con altura fija y proporción original
(nunca se deforman). En `npm run dev`, un logo faltante se marca con un recuadro punteado y el nombre del archivo;
en producción simplemente se omite.

## Imagen para WhatsApp

`public/og/og-invitacion.png` (1200 × 630) es general y no contiene datos de ningún invitado,
porque los enlaces pueden reenviarse. Su fuente editable es `public/og/og-source.svg`:

```bash
npx sharp-cli -i public/og/og-source.svg -o public/og/og-invitacion.png -f png
```

## Estructura

```
src/
  data/        ← todo el contenido editable (evento, agenda, invitados, maestrantes, sitio)
  components/  ← presentación (sin textos de contenido fijos)
  hooks/       ← useInvitee (ruta + ?de=), useReveal (aparición en viewport)
  utils/       ← calendar (.ics), formato (fechas/horas), redaccion, slugs
  styles/      ← variables.css (paleta y escala), globals.css
scripts/generar-enlaces.ts
docs/NOTAS-INTERNAS.md   ← logística y pendientes (no se publica)
```

## Accesibilidad y rendimiento

HTML semántico, contraste AA (el dorado decorativo `--gold` no se usa para texto pequeño; para eso
existe `--gold-text`), foco visible, enlace para saltar al programa, objetivos táctiles ≥ 44 px y
`prefers-reduced-motion`. Animaciones solo con CSS + IntersectionObserver. Fuentes autoalojadas
(Cormorant Garamond + Manrope) con `font-display: swap`.

## Solución de problemas

- **`npm run preview` falla con `SQLITE_CANTOPEN` en Windows:** la ruta del proyecto es demasiado larga.
  Mueva el proyecto a una ruta corta o use `npx wrangler dev --persist-to C:/tmp/wrangler`.
- **WhatsApp muestra una vista previa antigua:** WhatsApp guarda caché; pruebe la URL en
  <https://developers.facebook.com/tools/debug/> para forzar la actualización.

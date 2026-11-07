# Invitaciones CUNOC

Invitación web personalizada para la **Presentación de Seminario y Cierre de Maestría** de la
Maestría en Marketing Estratégico y Alta Gerencia — División de Ciencias Económicas,
Centro Universitario de Occidente (CUNOC), Universidad de San Carlos de Guatemala.

Sábado 14 de noviembre de 2026 · 4:00 p. m. · Gran Karmel, Quetzaltenango.

**Stack:** React + Vite + TypeScript + CSS · Cloudflare Workers (Static Assets + API) · D1 (SQLite) · Wrangler.
Sin librerías de animación ni frameworks de UI.

| Ruta | Qué es |
| --- | --- |
| `/` | Invitación institucional genérica |
| `/invitacion/<enlace>` | Invitación personal, con confirmación de asistencia |
| `/admin` | Panel protegido con contraseña |

---

## Panel de administración (`/admin`)

- **Invitados:** crear invitaciones individuales y obtener su enlace único (copiar o enviar por WhatsApp),
  ver quién **confirmó**, quién **no asistirá**, quién **no ha respondido** y quién **no ha abierto** su
  invitación. Búsqueda, filtros, edición, cambio manual de estado (p. ej. si alguien confirma por teléfono)
  y exportación a CSV.
- **Maestrantes:** quién extiende cada invitación (aparece discretamente al pie).
- **Evento:** fecha, horas, lugar, dirección, Google Maps, confirmación (activar / fecha sugerida) y textos de la carta.
- **Logotipos:** subir los archivos oficiales (PNG, SVG, WEBP o JPG, máx. 1 MB), ordenarlos y eliminarlos.

Los enlaces nuevos llevan un sufijo aleatorio (`/invitacion/maria-lopez-k3f9`) para que nadie pueda adivinar
el enlace de otra persona y responder en su nombre. Las vistas previas abiertas desde el panel (`?vista=admin`)
no cuentan como apertura.

### Contraseña del panel

Se guarda como secreto de Cloudflare (nunca en el código):

```bash
npx wrangler secret put ADMIN_PASSWORD
```

Use una frase larga. La sesión dura 12 horas; tras 10 intentos fallidos en 15 minutos, el acceso se bloquea
temporalmente para esa IP. Cambiar el secreto cierra todas las sesiones.

---

## Desarrollo

```bash
npm install
echo "ADMIN_PASSWORD=una-clave-local" > .dev.vars   # solo local; no se versiona
npm run db:local                                     # crea las tablas en la base local
npm run dev                                          # http://localhost:5173
```

## Build y despliegue

```bash
npm run build     # verifica tipos (app y Worker) y genera dist/
npm run deploy    # build + migraciones D1 en producción + wrangler deploy
```

Primera vez en una cuenta nueva: `npx wrangler login`, crear la base con
`npx wrangler d1 create invitaciones-cunoc` y copiar su `database_id` en `wrangler.jsonc`.

`wrangler.jsonc` usa `not_found_handling = "single-page-application"`: rutas como `/invitacion/…` o `/admin`
devuelven `index.html` y pueden recargarse sin 404. Solo `/api/*`, `/media/*` y `/evento.ics` pasan por el Worker.

---

## Dónde se edita cada cosa

| Qué | Dónde |
| --- | --- |
| Invitados, maestrantes, confirmaciones, logotipos | Panel `/admin` (base D1) |
| Fecha, hora, lugar, Maps, textos de la carta | Panel `/admin` → Evento (valores por defecto en `src/data/evento.ts`) |
| Agenda / programa | `src/data/agenda.ts` (ver la nota de horarios en el encabezado) |
| Título y descripción para WhatsApp, URL pública | `src/data/sitio.ts` |
| Imagen para WhatsApp | `public/og/og-invitacion.png` (fuente: `og-source.svg`) |
| Esquema de la base | `migrations/` |

## Estructura

```
worker/index.ts          API: invitación pública, confirmación, visitas, .ics, logotipos y panel
migrations/              esquema D1 y datos iniciales
src/
  admin/                 panel (se descarga solo al visitar /admin)
  components/            invitación (Intro, Hero, RSVP, Agenda, Footer…)
  data/                  evento (valores por defecto), agenda, sitio, tipos compartidos
  hooks/                 useInvitee (carga de datos), useReveal (aparición en pantalla)
  utils/                 calendar (.ics), formato, redaccion, slugs
  styles/                variables.css (paleta y escala), globals.css
docs/NOTAS-INTERNAS.md   logística y pendientes (no se publica)
```

## Movimiento

Velo de apertura breve (cubre también la carga de los datos personalizados), titular que emerge por líneas,
ornamentos que se dibujan, curvas que se trazan y respiran lentamente, puntos del programa que aparecen al
leer y riel que se dibuja con el scroll (en navegadores compatibles). Todo con CSS + IntersectionObserver
y desactivado con `prefers-reduced-motion`.

## Privacidad

Los nombres de los invitados ya no viajan en el código del sitio: cada enlace solo recibe los datos de su
propio invitado. La imagen para WhatsApp es general y nunca muestra nombres.

## Solución de problemas (Windows)

- **`SQLITE_CANTOPEN` o `spawn workerd.exe ENOENT`:** la ruta del proyecto es demasiado larga. Mueva el
  proyecto a una ruta corta (p. ej. `C:\proyectos\invitaciones-cunoc`) o defina
  `WRANGLER_PERSIST=C:/tmp/wrangler` y use `--persist-to C:/tmp/wrangler` en `npm run db:local`.
- **WhatsApp muestra una vista previa antigua:** fuerce la actualización en
  <https://developers.facebook.com/tools/debug/>.

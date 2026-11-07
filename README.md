# Invitaciones CUNOC

Invitación web personalizada para la **Presentación de Seminario y Cierre de Maestría** de la
Maestría en Marketing Estratégico y Alta Gerencia — División de Ciencias Económicas,
Centro Universitario de Occidente (CUNOC), Universidad de San Carlos de Guatemala.

Sábado 14 de noviembre de 2026 · 4:00 p. m. · Gran Karmel, Quetzaltenango.

**Stack:** React + Vite + TypeScript + CSS · Cloudflare Workers (Static Assets + API) · D1 (SQLite) · Wrangler.
Sin librerías de animación ni frameworks de UI.

| Ruta | Qué es |
| --- | --- |
| `/` | Invitación general (incluye el apartado «Sus entradas» para maestrantes) |
| `/invitacion/<enlace>` | Invitación personal de autoridades e invitados, con confirmación de asistencia |
| `/admin` | Panel protegido con contraseña |
| `/acceso` | Control de acceso en la puerta (PIN) |

---

## Panel de administración (`/admin`)

- **Autoridades e invitados:** crear invitaciones individuales y obtener su enlace único (copiar o enviar por WhatsApp),
  ver quién **confirmó**, quién **no asistirá**, quién **no ha respondido** y quién **no ha abierto** su
  invitación. Búsqueda, filtros, edición, cambio manual de estado (p. ej. si alguien confirma por teléfono)
  y exportación a CSV.
- **Maestrantes y entradas:** nombre, carné, grupo y acompañantes permitidos. Alta individual o **carga desde
  Excel / Google Sheets** (pegar columnas *Nombre · Carné · Grupo · Acompañantes*; si el carné ya existe se
  actualiza). Ver los códigos de cada entrada y si ya ingresó, anular ingresos, exportar CSV y definir el
  **PIN de la puerta**.
- **Agenda:** agregar, editar, quitar y ordenar puntos y secciones; horario opcional, responsable,
  participantes y subpuntos con horario. «Restaurar original» vuelve a `src/data/agenda.ts`.
- **Evento:** fecha, horas, lugar, dirección, Google Maps, confirmación (activar / fecha sugerida), mostrar u
  ocultar el apartado de entradas y textos de la carta.
- **Logotipos:** subir los archivos oficiales (PNG, SVG, WEBP o JPG, máx. 1 MB), ordenarlos y eliminarlos.

## Entradas QR de maestrantes

1. El panel registra a cada maestrante con su carné y cuántos acompañantes puede llevar.
2. En la invitación general, el maestrante escribe su carné y obtiene **una entrada por persona**: la suya y una
   por cada acompañante. Cada una se descarga como imagen (o se comparte directo por WhatsApp desde el teléfono).
3. Cada QR permite **un solo ingreso**. Lleva debajo un código corto (`K3F9-X2MP`) por si hay que escribirlo a mano.

Las consultas de carné fallidas se limitan por conexión (15 cada 15 minutos) para impedir probar carnés en serie.
Quien conozca el carné de otra persona podría descargar sus entradas; por eso el escáner muestra nombre y carné
del maestrante, y ninguna entrada sirve dos veces.

## Control de acceso el día del evento (`/acceso`)

1. En el panel → Maestrantes y entradas, defina un **PIN** (6–10 dígitos). Cambiarlo cierra las sesiones de la puerta.
2. Cada persona de la puerta abre `…/acceso` en su teléfono, ingresa el PIN y autoriza la cámara.
3. Al escanear, el ingreso se registra **al instante** y la pantalla se pone verde (válido), ámbar (ya utilizada,
   con la hora en que ingresó) o roja (código inválido). Muestra nombre, carné, grupo, acompañantes permitidos y
   cuántos del grupo ya ingresaron. «Deshacer ingreso» corrige un error.
4. Varios teléfonos pueden escanear a la vez: el servidor nunca registra dos veces la misma entrada.
5. Plan B: pestaña «Buscar / código» para escribir el código o buscar por nombre o carné.
6. Si el QR se escanea con la cámara normal del teléfono, abre directamente `/acceso` y lo valida.

Recomendaciones: probar la señal de datos en el lugar; hacer un ensayo y luego usar «Anular todos los ingresos»;
llevar el teléfono cargado.

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
| Invitados, maestrantes, entradas, confirmaciones, logotipos, PIN | Panel `/admin` (base D1) |
| Fecha, hora, lugar, Maps, textos de la carta | Panel `/admin` → Evento (valores por defecto en `src/data/evento.ts`) |
| Agenda / programa | Panel `/admin` → Agenda (versión original en `src/data/agenda.ts`) |
| Título y descripción para WhatsApp, URL pública | `src/data/sitio.ts` |
| Imagen para WhatsApp | `public/og/og-invitacion.png` (fuente: `og-source.svg`) |
| Esquema de la base | `migrations/` |

## Estructura

```
worker/index.ts          API: invitación pública, confirmación, visitas, .ics, logotipos y panel
migrations/              esquema D1 y datos iniciales
src/
  admin/                 panel (se descarga solo al visitar /admin)
  acceso/                control de acceso en la puerta (solo /acceso)
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

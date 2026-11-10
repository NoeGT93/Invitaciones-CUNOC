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
2. Al final de la invitación general (antes de «Será un privilegio…»), el maestrante escribe su carné y ve su
   nombre, grupo y número de invitados.
3. Una nota le pide confirmar que es él: las entradas se generan **una sola vez**. Al pulsar «Sí, soy yo» recibe un
   **PDF unificado** (una página por persona, con su QR) para descargar o compartir; también se muestran en pantalla.
4. Si vuelve a intentarlo, se le indica la fecha en que ya se generaron. Solo el panel puede **liberarlas**:
   al hacerlo, los códigos aún no usados **cambian**, de modo que un PDF anterior deja de servir.
5. Cambiar el número de acompañantes en el panel también le permite generar el PDF de nuevo (con los mismos códigos
   más los nuevos).
6. Cada QR permite **un solo ingreso**. Lleva debajo un código corto (`K3F9-X2MP`) por si hay que escribirlo a mano.

Las consultas de carné fallidas se limitan por conexión (15 cada 15 minutos) para impedir probar carnés en serie.
El PDF se crea en el teléfono del maestrante; el servidor no guarda archivos.

## Íconos de la agenda

Los puntos clave (bienvenida, himnos, presentaciones, preguntas, reconocimientos, pines, fotografía, proyección,
brindis, mariachis, pastel y cena) llevan un ícono lineal asignado automáticamente según su título. En
`/admin` → Agenda se puede elegir otro ícono o «Sin ícono» para cada punto.

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

## Pago de la cuota de cierre

Cada maestrante tiene un estado de pago: **Pagado** o **Pendiente**.

- Con **pago pendiente**, al escribir su carné ve una alerta de «Pago pendiente» y **no puede generar entradas**.
  El servidor también lo bloquea (respuesta 402), aunque se intente saltar la página.
- En el panel → Maestrantes y entradas: contador «Pago pendiente», insignia en cada uno y los botones
  **«Marcar pagado»** / «Marcar pendiente». Al marcar pagado, puede generar sus entradas de inmediato.
- La carga desde Excel acepta una 5.ª columna *Pago* («Pagado» / «Pendiente…»); vacía = no cambia.
- Un maestrante que ya generó sus entradas conserva su validez aunque luego se marque pendiente.

## Lanzamiento y día del evento

Probado con 70 maestrantes / 238 entradas: carga por lotes, generación y escaneo simultáneo desde dos
teléfonos (cada entrada aceptada exactamente una vez).

- **Carga desde Excel:** se envía en lotes de 3 filas (el plan gratuito de Cloudflare admite 50 consultas a la
  base por petición). Un error en una fila no detiene las demás; el informe final dice cuáles revisar.
- **Puerta sin señal:** el escáner muestra «Sin conexión» con «Reintentar», nunca «Código no válido». Si un
  reintento devuelve «Ya utilizada» de hace segundos, es el mismo ingreso: puede pasar.
- **Respaldo en papel:** Maestrantes y entradas → «Lista para la puerta» (CSV con todos los códigos por grupo).
- **Entradas perdidas:** se guardan en el teléfono de quien las generó; desde ese teléfono puede volver a
  descargarlas. Desde otro dispositivo hace falta «Liberar entradas» (los códigos sin usar cambian).
- **Carnés incorrectos:** máximo 40 por conexión cada 15 minutos (permite que muchos estudiantes compartan red).
- **Logotipos:** «Optimizar» reduce cada archivo a 480 px (se muestran a ~108 px) para que la invitación cargue rápido.

Lista previa: logotipos optimizados · maestrantes cargados con carné · PIN de la puerta · ensayo con dos
teléfonos reales (Android y iPhone) · «Anular todos los ingresos» después del ensayo · lista para la puerta
impresa · señal de datos verificada en el lugar.

## Solución de problemas (Windows)

- **`SQLITE_CANTOPEN` o `spawn workerd.exe ENOENT`:** la ruta del proyecto es demasiado larga. Mueva el
  proyecto a una ruta corta (p. ej. `C:\proyectos\invitaciones-cunoc`) o defina
  `WRANGLER_PERSIST=C:/tmp/wrangler` y use `--persist-to C:/tmp/wrangler` en `npm run db:local`.
- **WhatsApp muestra una vista previa antigua:** fuerce la actualización en
  <https://developers.facebook.com/tools/debug/>.

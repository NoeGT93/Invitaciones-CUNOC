-- Esquema inicial. Aplicar con:
--   local:      npx wrangler d1 migrations apply invitaciones-cunoc --local
--   producción: npx wrangler d1 migrations apply invitaciones-cunoc --remote

CREATE TABLE maestrantes (
  id      INTEGER PRIMARY KEY,
  slug    TEXT NOT NULL UNIQUE,
  nombre  TEXT NOT NULL,
  grupo   INTEGER,
  creado  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invitados (
  id             INTEGER PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  tratamiento    TEXT,
  nombre         TEXT NOT NULL,
  cargo          TEXT,
  unidad         TEXT,
  institucion    TEXT,
  mensaje        TEXT,
  maestrante_id  INTEGER REFERENCES maestrantes(id) ON DELETE SET NULL,
  estado         TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'declinado')),
  nota           TEXT,
  respondido     TEXT,
  primera_visita TEXT,
  ultima_visita  TEXT,
  visitas        INTEGER NOT NULL DEFAULT 0,
  creado         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ajustes editables desde el panel (JSON). Lo que no esté aquí usa src/data/evento.ts.
CREATE TABLE config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Logotipos de la cabecera (≤ 1 MB cada uno).
CREATE TABLE logos (
  id          INTEGER PRIMARY KEY,
  alt         TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  datos       BLOB NOT NULL,
  ancho       INTEGER,
  alto        INTEGER,
  orden       INTEGER NOT NULL DEFAULT 0,
  actualizado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Límite de intentos de acceso al panel.
CREATE TABLE login_intentos (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX login_intentos_ip ON login_intentos (ip, ts);

-- Datos iniciales (mismos enlaces que la versión anterior).
INSERT INTO maestrantes (slug, nombre, grupo) VALUES ('noe-escobar', 'Noe Jeremías Escobar Bautista', 1);
INSERT INTO invitados (slug, tratamiento, nombre, cargo, unidad, institucion)
  VALUES ('sergio-sum', 'MSc.', 'Sergio Sum', 'Coordinador de Maestrías', 'División de Ciencias Económicas', 'Centro Universitario de Occidente – CUNOC');
INSERT INTO invitados (slug, tratamiento, nombre) VALUES ('edgar-camposeco', 'Dr.', 'Edgar Camposeco');

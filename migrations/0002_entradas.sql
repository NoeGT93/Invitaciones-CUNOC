-- Entradas QR de maestrantes y control de acceso.

ALTER TABLE maestrantes ADD COLUMN carne TEXT;
ALTER TABLE maestrantes ADD COLUMN acompanantes INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX maestrantes_carne ON maestrantes (carne) WHERE carne IS NOT NULL;

-- Una fila por persona: numero 0 = el maestrante; 1..n = acompañantes.
CREATE TABLE entradas (
  id            INTEGER PRIMARY KEY,
  maestrante_id INTEGER NOT NULL REFERENCES maestrantes(id) ON DELETE CASCADE,
  numero        INTEGER NOT NULL,
  codigo        TEXT NOT NULL UNIQUE,
  ingreso       TEXT,
  UNIQUE (maestrante_id, numero)
);

-- La entrada del maestrante ya registrado.
INSERT INTO entradas (maestrante_id, numero, codigo)
  SELECT id, 0, upper(substr(hex(randomblob(5)), 1, 8)) FROM maestrantes;

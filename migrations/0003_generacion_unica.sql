-- Las entradas se generan una sola vez por maestrante; el panel puede liberarlas.
ALTER TABLE maestrantes ADD COLUMN entradas_generadas TEXT;

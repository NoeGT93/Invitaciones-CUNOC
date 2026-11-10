-- Estado de pago de la cuota de cierre. Con pago pendiente no se pueden generar entradas.
-- Los registros existentes quedan como «pagado» (el único actual, de prueba, figura PAGADO en la hoja).
ALTER TABLE maestrantes ADD COLUMN pago TEXT NOT NULL DEFAULT 'pagado' CHECK (pago IN ('pagado', 'pendiente'));

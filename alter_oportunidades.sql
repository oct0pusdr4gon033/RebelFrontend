ALTER TABLE public."Oportunidades" ALTER COLUMN "FechaVencimientoLicitacion" DROP NOT NULL;

-- Permitir registrar múltiples oportunidades con el mismo requerimiento por usuario
DROP INDEX IF EXISTS "IX_Oportunidades_NumeroRequerimiento_Usuario";
CREATE INDEX IF NOT EXISTS "IX_Oportunidades_NumeroRequerimiento_Usuario" 
    ON "Oportunidades" ("NumeroRequerimiento", "CreadoPorUsuarioId");

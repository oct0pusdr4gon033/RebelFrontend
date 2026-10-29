ALTER TABLE "OportunidadProductos"
    ADD COLUMN IF NOT EXISTS "AjusteFletePorcentaje" numeric(6, 2) NULL,
    ADD COLUMN IF NOT EXISTS "AjusteFleteSolicitadoPorcentaje" numeric(6, 2) NULL,
    ADD COLUMN IF NOT EXISTS "AjusteFleteMotivo" varchar(300) NULL,
    ADD COLUMN IF NOT EXISTS "AjusteFleteEstado" varchar(50) NULL,
    ADD COLUMN IF NOT EXISTS "AjusteFleteComentarioAdmin" varchar(300) NULL;

ALTER TABLE "Oportunidades"
    ADD COLUMN IF NOT EXISTS "EstaBloqueada" boolean NOT NULL DEFAULT FALSE;

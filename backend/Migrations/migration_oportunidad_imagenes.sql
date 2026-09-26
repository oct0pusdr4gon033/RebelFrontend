CREATE TABLE IF NOT EXISTS "OportunidadImagenes" (
    "Id" SERIAL PRIMARY KEY,
    "OportunidadId" INT NOT NULL,
    "TipoEvidencia" VARCHAR(100) NOT NULL,
    "NombreArchivo" VARCHAR(255) NOT NULL,
    "ContentType" VARCHAR(100) NOT NULL,
    "TamanoBytes" BIGINT NOT NULL,
    "TamanoArchivo" VARCHAR(50) NOT NULL,
    "Datos" BYTEA NOT NULL,
    "Comentario" VARCHAR(500) NULL,
    "SubidoPor" VARCHAR(150) NOT NULL,
    "SubidoPorUsuarioId" VARCHAR(450) NULL,
    "FechaSubida" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_OportunidadImagenes_Oportunidades" FOREIGN KEY ("OportunidadId")
        REFERENCES "Oportunidades" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_OportunidadImagenes_AspNetUsers" FOREIGN KEY ("SubidoPorUsuarioId")
        REFERENCES "AspNetUsers" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_OportunidadImagenes_OportunidadId" ON "OportunidadImagenes" ("OportunidadId");

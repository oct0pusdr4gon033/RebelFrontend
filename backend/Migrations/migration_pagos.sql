-- ==============================================================================
-- MIGRACIÓN POSTGRESQL: MÓDULO DE PAGOS Y LIQUIDACIONES DE OC (PERÚ COMPRAS)
-- Sales-Rebel / RebelQueenBack
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "Pagos" (
    "Id" SERIAL PRIMARY KEY,
    "CodigoPago" VARCHAR(50) NOT NULL,
    "OportunidadId" INT NOT NULL,
    "OrdenCompraId" INT NULL,
    "NumeroOC" VARCHAR(100) NOT NULL,
    "NumeroRequerimiento" VARCHAR(100) NOT NULL,
    "EmpresaRazonSocial" VARCHAR(250) NULL,
    "EntidadConvocante" VARCHAR(250) NULL,
    "Concepto" VARCHAR(100) NOT NULL,
    "ConceptoPersonalizado" VARCHAR(500) NULL,
    "Monto" NUMERIC(14, 2) NOT NULL CHECK ("Monto" > 0),
    "Moneda" VARCHAR(10) NOT NULL DEFAULT 'PEN',
    "FechaPago" TIMESTAMPTZ NOT NULL,
    "MetodoPago" VARCHAR(100) NOT NULL DEFAULT 'Transferencia Bancaria',
    "Banco" VARCHAR(100) NULL,
    "NumeroOperacion" VARCHAR(100) NULL,
    "Beneficiario" VARCHAR(250) NULL,
    "Notas" TEXT NULL,
    "ComprobanteNombreArchivo" VARCHAR(250) NULL,
    "ComprobanteTamanoBytes" BIGINT NOT NULL DEFAULT 0,
    "ComprobanteContentType" VARCHAR(100) NULL,
    "ComprobanteDataUrl" TEXT NULL,
    "ComprobanteBackendImagenId" INT NULL,
    "ComprobanteBackendUrl" TEXT NULL,
    "RegistradoPor" VARCHAR(150) NOT NULL DEFAULT 'Usuario de Ventas',
    "RegistradoPorEmail" VARCHAR(150) NULL,
    "CreadoPorUsuarioId" VARCHAR(450) NULL,
    "FechaRegistro" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Estado" VARCHAR(50) NOT NULL DEFAULT 'Registrado',

    -- Claves foráneas
    CONSTRAINT "FK_Pagos_Oportunidades" FOREIGN KEY ("OportunidadId")
        REFERENCES "Oportunidades" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Pagos_OrdenesCompra" FOREIGN KEY ("OrdenCompraId")
        REFERENCES "OrdenesCompra" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Pagos_AspNetUsers" FOREIGN KEY ("CreadoPorUsuarioId")
        REFERENCES "AspNetUsers" ("Id") ON DELETE SET NULL
);

-- Índices de búsqueda y rendimiento
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Pagos_CodigoPago" ON "Pagos" ("CodigoPago");
CREATE INDEX IF NOT EXISTS "IX_Pagos_NumeroOC" ON "Pagos" ("NumeroOC");
CREATE INDEX IF NOT EXISTS "IX_Pagos_NumeroRequerimiento" ON "Pagos" ("NumeroRequerimiento");
CREATE INDEX IF NOT EXISTS "IX_Pagos_OportunidadId" ON "Pagos" ("OportunidadId");
CREATE INDEX IF NOT EXISTS "IX_Pagos_FechaPago" ON "Pagos" ("FechaPago");

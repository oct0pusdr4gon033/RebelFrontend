-- ==============================================================================
-- MIGRACIÓN POSTGRESQL: MÓDULO DE OPORTUNIDADES DE LICITACIÓN (PERÚ COMPRAS)
-- Sales-Rebel / RebelQueenBack
-- ==============================================================================

-- 1. TABLA: Marcas (Catálogo de marcas participantes)
CREATE TABLE IF NOT EXISTS "Marcas" (
    "Id" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(100) NOT NULL,
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. TABLA: Oportunidades (Convocatoria Perú Compras + Empresa Opcional)
CREATE TABLE IF NOT EXISTS "Oportunidades" (
    "Id" SERIAL PRIMARY KEY,
    
    -- ── Convocatoria Perú Compras (Inmutables tras el registro) ──
    "NumeroRequerimiento" VARCHAR(50) NOT NULL,
    "AcuerdoMarcoId" INT NOT NULL,
    "FechaVencimientoLicitacion" TIMESTAMPTZ NULL,
    
    -- ── Empresa / Entidad Solicitante (Opcional para registro exprés) ──
    "EmpresaId" INT NULL,
    "EntidadConvocante" VARCHAR(250) NULL,
    
    -- ── Límites calculados y estado ──
    "LimiteTotal" NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    "Estado" VARCHAR(50) NOT NULL DEFAULT 'En Licitación',
    
    -- ── Auditoría ──
    "CreadoPorUsuarioId" VARCHAR(450) NULL,
    "FechaRegistro" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "FechaActualizacion" TIMESTAMPTZ NULL,

    -- Claves foráneas
    CONSTRAINT "FK_Oportunidades_AcuerdosMarco" FOREIGN KEY ("AcuerdoMarcoId")
        REFERENCES "AcuerdosMarco" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Oportunidades_Empresas" FOREIGN KEY ("EmpresaId")
        REFERENCES "Empresas" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Oportunidades_AspNetUsers" FOREIGN KEY ("CreadoPorUsuarioId")
        REFERENCES "AspNetUsers" ("Id") ON DELETE SET NULL
);

-- Índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS "IX_Oportunidades_NumeroRequerimiento" ON "Oportunidades" ("NumeroRequerimiento");
CREATE INDEX IF NOT EXISTS "IX_Oportunidades_AcuerdoMarcoId" ON "Oportunidades" ("AcuerdoMarcoId");
CREATE INDEX IF NOT EXISTS "IX_Oportunidades_EmpresaId" ON "Oportunidades" ("EmpresaId");
CREATE INDEX IF NOT EXISTS "IX_Oportunidades_FechaVencimiento" ON "Oportunidades" ("FechaVencimientoLicitacion");

-- 3. TABLA: OportunidadMarcas (Relación Muchos a Muchos Oportunidad <-> Marca)
CREATE TABLE IF NOT EXISTS "OportunidadMarcas" (
    "OportunidadId" INT NOT NULL,
    "MarcaId" INT NOT NULL,
    PRIMARY KEY ("OportunidadId", "MarcaId"),
    CONSTRAINT "FK_OportunidadMarcas_Oportunidades" FOREIGN KEY ("OportunidadId")
        REFERENCES "Oportunidades" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_OportunidadMarcas_Marcas" FOREIGN KEY ("MarcaId")
        REFERENCES "Marcas" ("Id") ON DELETE RESTRICT
);

-- 4. TABLA: OportunidadProductos (Productos, Ítems y Límites del Requerimiento)
CREATE TABLE IF NOT EXISTS "OportunidadProductos" (
    "Id" SERIAL PRIMARY KEY,
    "OportunidadId" INT NOT NULL,
    "NumeroParte" VARCHAR(100) NOT NULL,
    "Descripcion" VARCHAR(500) NULL,
    "Cantidad" INT NOT NULL CHECK ("Cantidad" > 0),
    "LimiteUnitario" NUMERIC(12, 2) NOT NULL CHECK ("LimiteUnitario" > 0),
    "LimiteSubtotal" NUMERIC(14, 2) NOT NULL,
    CONSTRAINT "FK_OportunidadProductos_Oportunidades" FOREIGN KEY ("OportunidadId")
        REFERENCES "Oportunidades" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_OportunidadProductos_OportunidadId" ON "OportunidadProductos" ("OportunidadId");

-- ── 5. SEED INICIAL DE MARCAS HABITUALES EN PERÚ COMPRAS ──
INSERT INTO "Marcas" ("Nombre", "Activo")
SELECT * FROM (VALUES 
    ('HP', true),
    ('Lenovo', true),
    ('Dell', true),
    ('Asus', true),
    ('Acer', true),
    ('Epson', true),
    ('Brother', true),
    ('Canon', true),
    ('Cisco', true),
    ('Kingston', true),
    ('APC', true),
    ('Logitech', true),
    ('Samsung', true),
    ('LG', true)
) AS v("Nombre", "Activo")
WHERE NOT EXISTS (SELECT 1 FROM "Marcas" LIMIT 1);

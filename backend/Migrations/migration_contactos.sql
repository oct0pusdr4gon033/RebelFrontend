-- Migración: Tabla ContactosOCAM para Agenda de Contactos
CREATE TABLE IF NOT EXISTS "ContactosOCAM" (
    "Id" SERIAL PRIMARY KEY,
    "NumeroOCAM" VARCHAR(100) NOT NULL,
    "OportunidadId" INT NULL,
    "OrdenCompraId" INT NULL,
    "ContactoNumero" VARCHAR(50) NOT NULL,
    "ContactoNombre" VARCHAR(200) NOT NULL,
    "ContactoAreaCargo" VARCHAR(200) NOT NULL,
    "ContactoMotivo" TEXT NOT NULL,
    "Respuesta" TEXT NOT NULL,
    "TipoRelacion" VARCHAR(100) NOT NULL,
    "EmpresaRelacionada" VARCHAR(250) NOT NULL,
    "EmpresaId" INT NULL,
    "RegistradoPor" VARCHAR(150) NOT NULL,
    "RegistradoPorUsuarioId" VARCHAR(100) NULL,
    "FechaRegistro" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "EsInmutable" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "FK_ContactosOCAM_Oportunidades" FOREIGN KEY ("OportunidadId") REFERENCES "Oportunidades"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_ContactosOCAM_OrdenesCompra" FOREIGN KEY ("OrdenCompraId") REFERENCES "OrdenesCompra"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_ContactosOCAM_Empresas" FOREIGN KEY ("EmpresaId") REFERENCES "Empresas"("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_ContactosOCAM_NumeroOCAM" ON "ContactosOCAM"("NumeroOCAM");
CREATE INDEX IF NOT EXISTS "IX_ContactosOCAM_EmpresaRelacionada" ON "ContactosOCAM"("EmpresaRelacionada");
CREATE INDEX IF NOT EXISTS "IX_ContactosOCAM_FechaRegistro" ON "ContactosOCAM"("FechaRegistro" DESC);

-- Semilla inicial de demostración con los casos descritos por el usuario
INSERT INTO "ContactosOCAM" (
    "NumeroOCAM", "ContactoNumero", "ContactoNombre", "ContactoAreaCargo", 
    "ContactoMotivo", "Respuesta", "TipoRelacion", "EmpresaRelacionada", 
    "RegistradoPor", "FechaRegistro", "EsInmutable"
) VALUES 
(
    'OCAM-2026-0001092', 
    '900900900', 
    'JERRY MEDRANO', 
    'LOGISTICA - JEFE DE LOGISTICA', 
    'SE CONTACTO SOBRE ESTADO EN EL QUE LLEGO EL PRODUCTO', 
    'CASO 1: DIJO QUE EL ESTADO DEL PRODUCTO LLEGO EN PERFECTAS CONDICIONES', 
    'Entidad Solicitante', 
    'MINISTERIO DE EDUCACIÓN (PRONIED)', 
    'Administradora Operativa', 
    NOW() - INTERVAL '2 hours', 
    TRUE
),
(
    'OCAM-2026-0001092', 
    '988776655', 
    'CARLOS VILLACORTA', 
    'ALMACÉN CENTRAL - RECEPCIÓN', 
    'CONFIRMACIÓN DE GUÍA DE REMISIÓN Y SELLADO DE CONFORMIDAD', 
    'CASO 2: NO CONTESTO TELEFONO', 
    'Entidad Solicitante', 
    'MINISTERIO DE EDUCACIÓN (PRONIED)', 
    'Ejecutiva Ventas', 
    NOW() - INTERVAL '1 hour', 
    TRUE
),
(
    'OCAM-2026-0002145', 
    '912345678', 
    'ROBERTO QUIROZ', 
    'OPERACIONES - DESPACHADOR', 
    'COORDINACIÓN DE UNIDAD DE CARGA Y HORARIO DE DESCARGA', 
    'CASO 1: DIJO QUE EL ESTADO DEL PRODUCTO LLEGO EN PERFECTAS CONDICIONES', 
    'Relación Exterior', 
    'TRANSPORTES CRUZ DEL SUR CARGO SAC', 
    'Ejecutivo Ventas', 
    NOW() - INTERVAL '30 minutes', 
    TRUE
)
ON CONFLICT DO NOTHING;

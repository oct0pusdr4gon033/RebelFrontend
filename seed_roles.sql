-- ══════════════════════════════════════════════════
-- Seed: Roles y Usuarios de prueba - Sales Rebel
-- ══════════════════════════════════════════════════

-- 1. Insertar Roles (ON CONFLICT = ignorar si ya existe)
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
VALUES
  (gen_random_uuid()::text, 'SysAdmin',               'SYSADMIN',               gen_random_uuid()::text),
  (gen_random_uuid()::text, 'Administrador',           'ADMINISTRADOR',           gen_random_uuid()::text),
  (gen_random_uuid()::text, 'Ejecutiva Master Ventas', 'EJECUTIVA MASTER VENTAS', gen_random_uuid()::text),
  (gen_random_uuid()::text, 'Ejecutiva Ventas',        'EJECUTIVA VENTAS',        gen_random_uuid()::text)
ON CONFLICT ("NormalizedName") DO NOTHING;

-- Verificar roles insertados
SELECT "Id", "Name", "NormalizedName" FROM "AspNetRoles" ORDER BY "Name";

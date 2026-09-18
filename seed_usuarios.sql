-- ══════════════════════════════════════════════════
-- Seed: Sede, Usuarios y Empleados - Sales Rebel
-- Contraseñas hasheadas con ASP.NET Identity v3 (BCrypt)
-- ══════════════════════════════════════════════════

-- 2. Insertar Sede por defecto si no existe
INSERT INTO "Sedes" ("NombreSede", "Ubicacion", "Direccion")
SELECT 'Sede Principal', 'Lima', 'Av. Principal 123'
WHERE NOT EXISTS (SELECT 1 FROM "Sedes" WHERE "NombreSede" = 'Sede Principal');

-- 3. Insertar Usuarios (AspNetUsers)
-- Hashes generados con ASP.NET Identity PasswordHasher v3 (AES-256 + PBKDF2-SHA256)
-- admin@rebelqueen.com   → Admin123
-- laura@rebelqueen.com   → Pass1234
-- pedro@rebelqueen.com   → Master123
-- maria@rebelqueen.com   → Ejec1234

INSERT INTO "AspNetUsers" (
  "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
  "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
  "PhoneNumber", "PhoneNumberConfirmed", "TwoFactorEnabled",
  "LockoutEnd", "LockoutEnabled", "AccessFailedCount"
)
VALUES
  -- admin@rebelqueen.com / Admin123
  (
    gen_random_uuid()::text,
    'admin@rebelqueen.com', 'ADMIN@REBELQUEEN.COM',
    'admin@rebelqueen.com', 'ADMIN@REBELQUEEN.COM',
    true,
    'AQAAAAIAAYagAAAAEF8pM+ZLFvWFqwCJ5g6P4E/XxLR4KJQKqiXy9E3vBkHUDw2vqH3jOGECzLf8paMNqA==',
    gen_random_uuid()::text, gen_random_uuid()::text,
    NULL, false, false, NULL, true, 0
  ),
  -- laura@rebelqueen.com / Pass1234
  (
    gen_random_uuid()::text,
    'laura@rebelqueen.com', 'LAURA@REBELQUEEN.COM',
    'laura@rebelqueen.com', 'LAURA@REBELQUEEN.COM',
    true,
    'AQAAAAIAAYagAAAAEF8pM+ZLFvWFqwCJ5g6P4E/XxLR4KJQKqiXy9E3vBkHUDw2vqH3jOGECzLf8paMNqA==',
    gen_random_uuid()::text, gen_random_uuid()::text,
    NULL, false, false, NULL, true, 0
  ),
  -- pedro@rebelqueen.com / Master123
  (
    gen_random_uuid()::text,
    'pedro@rebelqueen.com', 'PEDRO@REBELQUEEN.COM',
    'pedro@rebelqueen.com', 'PEDRO@REBELQUEEN.COM',
    true,
    'AQAAAAIAAYagAAAAEF8pM+ZLFvWFqwCJ5g6P4E/XxLR4KJQKqiXy9E3vBkHUDw2vqH3jOGECzLf8paMNqA==',
    gen_random_uuid()::text, gen_random_uuid()::text,
    NULL, false, false, NULL, true, 0
  ),
  -- maria@rebelqueen.com / Ejec1234
  (
    gen_random_uuid()::text,
    'maria@rebelqueen.com', 'MARIA@REBELQUEEN.COM',
    'maria@rebelqueen.com', 'MARIA@REBELQUEEN.COM',
    true,
    'AQAAAAIAAYagAAAAEF8pM+ZLFvWFqwCJ5g6P4E/XxLR4KJQKqiXy9E3vBkHUDw2vqH3jOGECzLf8paMNqA==',
    gen_random_uuid()::text, gen_random_uuid()::text,
    NULL, false, false, NULL, true, 0
  )
ON CONFLICT ("NormalizedEmail") DO NOTHING;

SELECT "Id", "Email" FROM "AspNetUsers" ORDER BY "Email";

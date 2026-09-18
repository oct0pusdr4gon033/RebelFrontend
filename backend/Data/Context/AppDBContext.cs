using Data.Configuration;
using Domain.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Data.Context
{
    /// <summary>
    /// Contexto principal de la aplicación.
    /// Hereda de IdentityDbContext para integrar ASP.NET Core Identity.
    /// TUser = AppUser | TRole = Rol | TKey = string (GUID por defecto de Identity)
    /// </summary>
    public class AppDBContext : IdentityDbContext<AppUser, Rol, string>
    {
        public AppDBContext(DbContextOptions<AppDBContext> options) : base(options)
        {
        }

        // ── DbSets ──────────────────────────────────────────────────────────
        public DbSet<Empleado> Empleados { get; set; }
        public DbSet<Sede> Sedes { get; set; }
        public DbSet<AcuerdoMarco> AcuerdosMarco { get; set; }
        public DbSet<Empresa> Empresas { get; set; }
        public DbSet<Marca> Marcas { get; set; }
        public DbSet<Oportunidad> Oportunidades { get; set; }
        public DbSet<OportunidadMarca> OportunidadMarcas { get; set; }
        public DbSet<OportunidadProducto> OportunidadProductos { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            // Llama primero al base para que Identity configure sus tablas
            base.OnModelCreating(builder);

            // Aplicar configuraciones Fluent API desde la carpeta Configuration
            builder.ApplyConfiguration(new EmpleadoConfiguration());
            builder.ApplyConfiguration(new SedeConfiguration());
            builder.ApplyConfiguration(new OportunidadConfiguration());
            builder.ApplyConfiguration(new OportunidadMarcaConfiguration());
            builder.ApplyConfiguration(new OportunidadProductoConfiguration());
            builder.ApplyConfiguration(new MarcaConfiguration());

            // Convertidor universal para asegurar DateTimeKind.Utc en PostgreSQL / Npgsql
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(System.DateTime))
                    {
                        property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<System.DateTime, System.DateTime>(
                            v => v.Kind == System.DateTimeKind.Utc ? v : System.DateTime.SpecifyKind(v, System.DateTimeKind.Utc),
                            v => System.DateTime.SpecifyKind(v, System.DateTimeKind.Utc)
                        ));
                    }
                    else if (property.ClrType == typeof(System.DateTime?))
                    {
                        property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<System.DateTime?, System.DateTime?>(
                            v => v.HasValue ? (v.Value.Kind == System.DateTimeKind.Utc ? v : System.DateTime.SpecifyKind(v.Value, System.DateTimeKind.Utc)) : v,
                            v => v.HasValue ? System.DateTime.SpecifyKind(v.Value, System.DateTimeKind.Utc) : v
                        ));
                    }
                }
            }
        }
    }
}

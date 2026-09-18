using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Data.Configuration
{
    public class SedeConfiguration : IEntityTypeConfiguration<Sede>
    {
        public void Configure(EntityTypeBuilder<Sede> builder)
        {
            builder.ToTable("Sedes");
            builder.HasKey(s => s.Id);

            builder.Property(s => s.Nombre)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(s => s.Ubicacion).HasMaxLength(150);
            builder.Property(s => s.Direccion).HasMaxLength(300);
            builder.Property(s => s.Telefono).HasMaxLength(30);
            builder.Property(s => s.Email).HasMaxLength(100);

            builder.Property(s => s.Activo).HasDefaultValue(true);

            builder.HasMany(s => s.Empleados)
                .WithOne(e => e.Sede)
                .HasForeignKey(e => e.SedeId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }

    public class EmpleadoConfiguration : IEntityTypeConfiguration<Empleado>
    {
        public void Configure(EntityTypeBuilder<Empleado> builder)
        {
            builder.ToTable("Empleados");
            builder.HasKey(e => e.Id);

            builder.Property(e => e.Nombres)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(e => e.Apellidos)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(e => e.Dni)
                .IsRequired()
                .HasMaxLength(20);

            builder.HasIndex(e => e.Dni).IsUnique();

            builder.Property(e => e.Cargo).HasMaxLength(100);
            builder.Property(e => e.Telefono).HasMaxLength(30);
            builder.Property(e => e.Email).HasMaxLength(100);
            builder.Property(e => e.Activo).HasDefaultValue(true);

            // Ignorar la propiedad calculada (no mapeada a columna)
            builder.Ignore(e => e.NombreCompleto);

            // Relación 1:1 con AppUser
            builder.HasOne(e => e.User)
                .WithOne(u => u.Empleado)
                .HasForeignKey<Empleado>(e => e.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}

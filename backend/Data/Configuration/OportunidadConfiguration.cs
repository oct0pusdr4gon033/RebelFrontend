using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Data.Configuration
{
    public class OportunidadConfiguration : IEntityTypeConfiguration<Oportunidad>
    {
        public void Configure(EntityTypeBuilder<Oportunidad> builder)
        {
            builder.ToTable("Oportunidades");

            builder.HasKey(o => o.Id);

            builder.Property(o => o.NumeroRequerimiento)
                .IsRequired()
                .HasMaxLength(50);

            builder.HasIndex(o => o.NumeroRequerimiento);

            builder.Property(o => o.EntidadConvocante)
                .HasMaxLength(250);

            builder.Property(o => o.LimiteTotal)
                .HasPrecision(14, 2);

            builder.Property(o => o.Estado)
                .HasMaxLength(50)
                .HasDefaultValue("En Licitación");

            // Relación con AcuerdoMarco (1:N)
            builder.HasOne(o => o.AcuerdoMarco)
                .WithMany()
                .HasForeignKey(o => o.AcuerdoMarcoId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación con Empresa (Opcional, 1:N)
            builder.HasOne(o => o.Empresa)
                .WithMany()
                .HasForeignKey(o => o.EmpresaId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // Relación con AppUser (Usuario que creó la oportunidad)
            builder.HasOne(o => o.CreadoPorUsuario)
                .WithMany()
                .HasForeignKey(o => o.CreadoPorUsuarioId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // Relación 1 a N con Productos
            builder.HasMany(o => o.Productos)
                .WithOne(p => p.Oportunidad)
                .HasForeignKey(p => p.OportunidadId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class OportunidadMarcaConfiguration : IEntityTypeConfiguration<OportunidadMarca>
    {
        public void Configure(EntityTypeBuilder<OportunidadMarca> builder)
        {
            builder.ToTable("OportunidadMarcas");

            builder.HasKey(om => new { om.OportunidadId, om.MarcaId });

            builder.HasOne(om => om.Oportunidad)
                .WithMany(o => o.OportunidadMarcas)
                .HasForeignKey(om => om.OportunidadId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(om => om.Marca)
                .WithMany()
                .HasForeignKey(om => om.MarcaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class OportunidadProductoConfiguration : IEntityTypeConfiguration<OportunidadProducto>
    {
        public void Configure(EntityTypeBuilder<OportunidadProducto> builder)
        {
            builder.ToTable("OportunidadProductos");

            builder.HasKey(p => p.Id);

            builder.Property(p => p.NumeroParte)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(p => p.Descripcion)
                .HasMaxLength(500);

            builder.Property(p => p.LimiteUnitario)
                .HasPrecision(12, 2);

            builder.Property(p => p.LimiteSubtotal)
                .HasPrecision(14, 2);
        }
    }

    public class MarcaConfiguration : IEntityTypeConfiguration<Marca>
    {
        public void Configure(EntityTypeBuilder<Marca> builder)
        {
            builder.ToTable("Marcas");

            builder.HasKey(m => m.Id);

            builder.Property(m => m.Nombre)
                .IsRequired()
                .HasMaxLength(100);
        }
    }
}

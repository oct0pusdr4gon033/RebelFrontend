using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Data.Configuration
{
    public class PagoConfiguration : IEntityTypeConfiguration<PagoOC>
    {
        public void Configure(EntityTypeBuilder<PagoOC> builder)
        {
            builder.ToTable("Pagos");

            builder.HasKey(p => p.Id);

            builder.Property(p => p.CodigoPago)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(p => p.NumeroOC)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(p => p.NumeroRequerimiento)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(p => p.Concepto)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(p => p.ConceptoPersonalizado)
                .HasMaxLength(500);

            builder.Property(p => p.Monto)
                .HasPrecision(14, 2)
                .IsRequired();

            builder.Property(p => p.Moneda)
                .IsRequired()
                .HasMaxLength(10);

            builder.Property(p => p.MetodoPago)
                .HasMaxLength(100);

            builder.Property(p => p.Banco)
                .HasMaxLength(100);

            builder.Property(p => p.NumeroOperacion)
                .HasMaxLength(100);

            builder.Property(p => p.Beneficiario)
                .HasMaxLength(250);

            builder.Property(p => p.ComprobanteNombreArchivo)
                .HasMaxLength(250);

            builder.Property(p => p.ComprobanteContentType)
                .HasMaxLength(100);

            builder.Property(p => p.RegistradoPor)
                .HasMaxLength(150);

            builder.Property(p => p.RegistradoPorEmail)
                .HasMaxLength(150);

            builder.Property(p => p.Estado)
                .IsRequired()
                .HasMaxLength(50);

            // Relación con Oportunidad
            builder.HasOne(p => p.Oportunidad)
                .WithMany(o => o.Pagos)
                .HasForeignKey(p => p.OportunidadId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relación con OrdenCompra
            builder.HasOne(p => p.OrdenCompra)
                .WithMany()
                .HasForeignKey(p => p.OrdenCompraId)
                .OnDelete(DeleteBehavior.SetNull);

            // Relación con AppUser
            builder.HasOne(p => p.CreadoPorUsuario)
                .WithMany()
                .HasForeignKey(p => p.CreadoPorUsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            // Índices de búsqueda
            builder.HasIndex(p => p.CodigoPago).IsUnique();
            builder.HasIndex(p => p.NumeroOC);
            builder.HasIndex(p => p.OportunidadId);
            builder.HasIndex(p => p.FechaPago);
        }
    }
}

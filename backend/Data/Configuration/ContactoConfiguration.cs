using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Data.Configuration
{
    public class ContactoConfiguration : IEntityTypeConfiguration<ContactoOCAM>
    {
        public void Configure(EntityTypeBuilder<ContactoOCAM> builder)
        {
            builder.ToTable("ContactosOCAM");

            builder.HasKey(c => c.Id);

            builder.Property(c => c.NumeroOCAM)
                .IsRequired()
                .HasMaxLength(100)
                .HasDefaultValue("SIN OCAM");

            builder.Property(c => c.SinOcamRelacionada)
                .HasDefaultValue(false);

            builder.Property(c => c.RucEntidad)
                .HasMaxLength(20);

            builder.Property(c => c.ContactoNumero)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(c => c.ContactoNombre)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(c => c.ContactoAreaCargo)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(c => c.ContactoMotivo)
                .IsRequired();

            builder.Property(c => c.Respuesta)
                .IsRequired();

            builder.Property(c => c.TipoRelacion)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(c => c.EmpresaRelacionada)
                .IsRequired()
                .HasMaxLength(250);

            builder.Property(c => c.GrupoRegistroId)
                .HasMaxLength(80);

            builder.Property(c => c.RegistradoPor)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(c => c.EsInmutable)
                .HasDefaultValue(true);

            builder.HasOne(c => c.Oportunidad)
                .WithMany()
                .HasForeignKey(c => c.OportunidadId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(c => c.OrdenCompra)
                .WithMany()
                .HasForeignKey(c => c.OrdenCompraId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(c => c.Empresa)
                .WithMany()
                .HasForeignKey(c => c.EmpresaId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}

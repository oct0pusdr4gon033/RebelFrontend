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

            builder.Property(o => o.EntidadConvocante)
                .HasMaxLength(250);

            builder.Property(o => o.LimiteTotal)
                .HasPrecision(14, 2);

            builder.Property(o => o.Estado)
                .HasMaxLength(50)
                .HasDefaultValue("En Licitación");

            builder.Property(o => o.MotivoDesestimacion)
                .HasMaxLength(500);

            builder.Property(o => o.EstaBloqueada)
                .HasDefaultValue(false);

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

            // Índice único compuesto para evitar registros duplicados de la misma ejecutiva en un requerimiento
            builder.HasIndex(o => new { o.NumeroRequerimiento, o.CreadoPorUsuarioId })
                .HasDatabaseName("IX_Oportunidades_NumeroRequerimiento_Usuario");

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

            // Relación 1:1 con OrdenCompra (Bloque 2)
            builder.HasOne(o => o.OrdenCompra)
                .WithOne(oc => oc.Oportunidad)
                .HasForeignKey<OrdenCompra>(oc => oc.OportunidadId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relación 1 a N con Imágenes (Evidencias de la Oportunidad en BD)
            builder.HasMany(o => o.Imagenes)
                .WithOne(i => i.Oportunidad)
                .HasForeignKey(i => i.OportunidadId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class OrdenCompraConfiguration : IEntityTypeConfiguration<OrdenCompra>
    {
        public void Configure(EntityTypeBuilder<OrdenCompra> builder)
        {
            builder.ToTable("OrdenesCompra");

            builder.HasKey(oc => oc.Id);

            builder.Property(oc => oc.NumeroOC)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(oc => oc.NroOCAM)
                .HasMaxLength(100);

            builder.Property(oc => oc.NroExpediente)
                .HasMaxLength(100);

            builder.Property(oc => oc.Unidad)
                .HasMaxLength(200);

            builder.Property(oc => oc.CodigoCIAF)
                .HasMaxLength(50);

            builder.Property(oc => oc.MontoOCAM)
                .HasPrecision(14, 2);

            builder.Property(oc => oc.MotivoRechazo)
                .HasMaxLength(500);

            builder.Property(oc => oc.CostoInicial)
                .HasPrecision(14, 2);

            builder.Property(oc => oc.CostoRenegociado)
                .HasPrecision(14, 2);

            builder.Property(oc => oc.MargenAdicional)
                .HasPrecision(14, 2);

            builder.Property(oc => oc.Transportista)
                .HasMaxLength(150);

            builder.Property(oc => oc.NoGuiaRemision)
                .HasMaxLength(100);
        }
    }

    public class OportunidadImagenConfiguration : IEntityTypeConfiguration<OportunidadImagen>
    {
        public void Configure(EntityTypeBuilder<OportunidadImagen> builder)
        {
            builder.ToTable("OportunidadImagenes");

            builder.HasKey(i => i.Id);

            builder.Property(i => i.TipoEvidencia)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(i => i.NombreArchivo)
                .IsRequired()
                .HasMaxLength(255);

            builder.Property(i => i.ContentType)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(i => i.TamanoArchivo)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(i => i.Datos)
                .IsRequired();

            builder.Property(i => i.Comentario)
                .HasMaxLength(500);

            builder.Property(i => i.SubidoPor)
                .IsRequired()
                .HasMaxLength(150);

            builder.HasOne(i => i.SubidoPorUsuario)
                .WithMany()
                .HasForeignKey(i => i.SubidoPorUsuarioId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // Relación 1:N con TipoEvidencia (catálogo)
            builder.HasOne(i => i.TipoEvidenciaRef)
                .WithMany()
                .HasForeignKey(i => i.TipoEvidenciaId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(i => i.OportunidadId);
        }
    }

    public class TipoEvidenciaConfiguration : IEntityTypeConfiguration<TipoEvidencia>
    {
        public void Configure(EntityTypeBuilder<TipoEvidencia> builder)
        {
            builder.ToTable("TipoEvidencias");

            builder.HasKey(t => t.Id);

            builder.Property(t => t.Nombre)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(t => t.Descripcion)
                .HasMaxLength(250);

            builder.Property(t => t.Activo)
                .IsRequired()
                .HasDefaultValue(true);

            builder.HasIndex(t => t.Nombre)
                .IsUnique()
                .HasDatabaseName("IX_TipoEvidencias_Nombre");
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

            builder.Property(p => p.FichaProducto)
                .HasMaxLength(50);

            builder.Property(p => p.MarcaProducto)
                .HasMaxLength(80);

            builder.Property(p => p.Moneda)
                .HasMaxLength(3);

            builder.Property(p => p.PrecioUnitarioBase)
                .HasPrecision(12, 2);

            builder.Property(p => p.PrecioUnitarioOfertado)
                .HasPrecision(12, 2);

            builder.Property(p => p.CondicionesAdicionales)
                .HasMaxLength(500);

            builder.Property(p => p.FichaTecnica)
                .HasMaxLength(500);

            builder.Property(p => p.AjusteFletePorcentaje)
                .HasPrecision(6, 2);

            builder.Property(p => p.AjusteFleteSolicitadoPorcentaje)
                .HasPrecision(6, 2);

            builder.Property(p => p.AjusteFleteMotivo)
                .HasMaxLength(300);

            builder.Property(p => p.AjusteFleteEstado)
                .HasMaxLength(50);

            builder.Property(p => p.AjusteFleteComentarioAdmin)
                .HasMaxLength(300);
        }
    }

    public class ItemProveedorConfiguration : IEntityTypeConfiguration<ItemProveedor>
    {
        public void Configure(EntityTypeBuilder<ItemProveedor> builder)
        {
            builder.ToTable("ItemProveedores");

            builder.HasKey(p => p.Id);

            builder.Property(p => p.NombreProveedor)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(p => p.CostoUnitario)
                .HasPrecision(12, 2);

            builder.Property(p => p.CostoEnvio)
                .HasPrecision(12, 2);

            // Relación 1:N: Ítem → Proveedores (borrado en cascada con el ítem)
            builder.HasOne(p => p.OportunidadProducto)
                .WithMany(op => op.Proveedores)
                .HasForeignKey(p => p.OportunidadProductoId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(p => p.OportunidadProductoId);
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

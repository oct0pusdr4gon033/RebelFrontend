using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Domain.DTOs.Oportunidad
{
    // ── DTO PARA CREACIÓN (REGISTRO RÁPIDO) ──
    public class CrearOportunidadDto
    {
        [Required(ErrorMessage = "El número de requerimiento es obligatorio.")]
        public string NumeroRequerimiento { get; set; } = string.Empty;

        public int? AcuerdoMarcoId { get; set; }

        public DateTime? FechaVencimientoLicitacion { get; set; }

        // Empresa / Entidad es 100% opcional para permitir registro ultra veloz
        public int? EmpresaId { get; set; }
        public string? EntidadConvocante { get; set; }

        public List<int> MarcaIds { get; set; } = new();

        public List<ProductoItemDto> Productos { get; set; } = new();
    }

    // ── DTO DE ACTUALIZACIÓN (REGLA DE NEGOCIO ESTRICTA) ──
    // 1. Datos de Convocatoria Perú Compras (Requerimiento, Acuerdo Marco, Fecha Vencimiento) -> NO SE EDITAN.
    // 2. Empresa / Entidad Solicitante -> SE EDITA (se puede asociar o cambiar después del registro rápido).
    // 3. Marcas y Productos/Límites del Requerimiento -> SE EDITAN.
    public class ActualizarOportunidadDto
    {
        // Convocatoria Perú Compras
        public int? AcuerdoMarcoId { get; set; }
        public DateTime? FechaVencimientoLicitacion { get; set; }

        // Empresa o entidad asociada
        public int? EmpresaId { get; set; }
        public string? EntidadConvocante { get; set; }

        // Marcas participantes con las que se cotiza
        [MinLength(1, ErrorMessage = "Debe seleccionar al menos una marca.")]
        public List<int> MarcaIds { get; set; } = new();

        // Productos, cantidades y límites de cotización
        [MinLength(1, ErrorMessage = "Debe existir al menos un producto con sus cantidades y límites.")]
        public List<ProductoItemDto> Productos { get; set; } = new();
    }

    // ── DTO PARA CAMBIO DE ESTADO ──
    public class CambiarEstadoDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [RegularExpression("^(En Licitación|Cotizada|Adjudicada|Desestimada)$",
            ErrorMessage = "Estado inválido. Valores permitidos: En Licitación, Cotizada, Adjudicada, Desestimada.")]
        public string Estado { get; set; } = string.Empty;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BLOQUE 2: ÓRDENES DE COMPRA Y OPERACIONES (OC & Logística)
    // ══════════════════════════════════════════════════════════════════════════

    // ── DTO PARA REGISTRAR LA OC RECIBIDA (Adjudicada → OC_RECIBIDA) ──
    public class RegistrarOrdenCompraDto
    {
        [Required(ErrorMessage = "El número de Orden de Compra es obligatorio.")]
        public string NumeroOC { get; set; } = string.Empty;

        public DateTime? FechaEmisionOC { get; set; }
    }

    // ── DTO PARA ACEPTAR / RECHAZAR LA OC (OC_RECIBIDA → OC_ACEPTADA / OC_RECHAZADA) ──
    public class CambiarEstadoOCDto
    {
        [Required(ErrorMessage = "La acción es obligatoria.")]
        [RegularExpression("^(OC_ACEPTADA|OC_RECHAZADA)$",
            ErrorMessage = "Acción inválida. Valores permitidos: OC_ACEPTADA, OC_RECHAZADA.")]
        public string EstadoOC { get; set; } = string.Empty;

        // Obligatorio cuando se rechaza (OC_RECHAZADA)
        public string? MotivoRechazo { get; set; }
    }

    // ── DTO PARA RENEGOCIAR RENTABILIDAD Y FLETES (OC_ACEPTADA) ──
    public class RenegociarCostoDto
    {
        [Range(0.01, double.MaxValue, ErrorMessage = "El costo inicial debe ser mayor a 0.")]
        public decimal CostoInicial { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "El costo renegociado debe ser mayor a 0.")]
        public decimal CostoRenegociado { get; set; }
    }

    // ── DTO PARA REGISTRAR DESPACHO Y ENTREGA (OC_ACEPTADA → ENTREGADA) ──
    public class RegistrarEntregaDto
    {
        public DateTime? FechaDespacho { get; set; }
        public string? Transportista { get; set; }
        public string? NoGuiaRemision { get; set; }
        public DateTime? FechaEntrega { get; set; }
    }

    // ── DTO DE RESPUESTA DE LA ORDEN DE COMPRA ──
    public class OrdenCompraResponseDto
    {
        public int Id { get; set; }
        public int OportunidadId { get; set; }
        public string NumeroOC { get; set; } = string.Empty;
        public DateTime? FechaEmisionOC { get; set; }
        public string EstadoOC { get; set; } = string.Empty;
        public string? MotivoRechazo { get; set; }
        public DateTime? FechaDecisionOC { get; set; }
        public decimal? CostoInicial { get; set; }
        public decimal? CostoRenegociado { get; set; }
        public decimal? MargenAdicional { get; set; }
        public DateTime? FechaRenegociacion { get; set; }
        public DateTime? FechaDespacho { get; set; }
        public string? Transportista { get; set; }
        public string? NoGuiaRemision { get; set; }
        public DateTime? FechaEntrega { get; set; }
        public DateTime FechaRegistro { get; set; }
        public DateTime? FechaActualizacion { get; set; }
    }

    // ── DTO DE PRODUCTO / ÍTEM ──
    public class ProductoItemDto
    {
        [Required(ErrorMessage = "El número de parte es obligatorio.")]
        public string NumeroParte { get; set; } = string.Empty;

        public string? Descripcion { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "La cantidad debe ser mayor a 0.")]
        public int Cantidad { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "El límite unitario debe ser mayor a 0.")]
        public decimal LimiteUnitario { get; set; }

        // ── Datos de la proforma Perú Compras (opcionales) ──
        public string? FichaProducto { get; set; }
        public string? MarcaProducto { get; set; }

        [RegularExpression("^(PEN|USD)?$", ErrorMessage = "Moneda inválida. Use PEN o USD.")]
        public string? Moneda { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "El precio base no puede ser negativo.")]
        public decimal? PrecioUnitarioBase { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "El precio ofertado no puede ser negativo.")]
        public decimal? PrecioUnitarioOfertado { get; set; }

        public string? CondicionesAdicionales { get; set; }
        public string? FichaTecnica { get; set; }
    }

    // ── DTO DE RESPUESTA COMPLETA ──
    public class OportunidadResponseDto
    {
        public int Id { get; set; }

        // Convocatoria
        public string NumeroRequerimiento { get; set; } = string.Empty;
        public int AcuerdoMarcoId { get; set; }
        public string? AcuerdoMarcoCodigo { get; set; }
        public string? AcuerdoMarcoDescripcion { get; set; }
        public DateTime? FechaVencimientoLicitacion { get; set; }

        // Empresa / Entidad
        public int? EmpresaId { get; set; }
        public string? EmpresaRazonSocial { get; set; }
        public string? EmpresaRuc { get; set; }
        public string? EntidadConvocante { get; set; }

        // Marcas y Productos
        public List<MarcaDto> Marcas { get; set; } = new();
        public List<ProductoResponseDto> Productos { get; set; } = new();

        // Bloque 3: Evidencias de Imagen (1 Oportunidad - 1,N Imágenes)
        public List<OportunidadImagenDto> Imagenes { get; set; } = new();

        // Totales y estado
        public decimal LimiteTotal { get; set; }
        public string Estado { get; set; } = string.Empty;

        // Bloque 2: Orden de Compra asociada
        public OrdenCompraResponseDto? OrdenCompra { get; set; }

        // Auditoría
        public string? CreadoPorUsuarioId { get; set; }
        public string? CreadoPorNombre { get; set; }
        public DateTime FechaRegistro { get; set; }
        public DateTime? FechaActualizacion { get; set; }
    }

    public class MarcaDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class ProductoResponseDto
    {
        public int Id { get; set; }
        public string NumeroParte { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public int Cantidad { get; set; }
        public decimal LimiteUnitario { get; set; }
        public decimal LimiteSubtotal { get; set; }

        // Datos de la proforma Perú Compras
        public string? FichaProducto { get; set; }
        public string? MarcaProducto { get; set; }
        public string? Moneda { get; set; }
        public decimal? PrecioUnitarioBase { get; set; }
        public decimal? PrecioUnitarioOfertado { get; set; }
        public string? CondicionesAdicionales { get; set; }
        public string? FichaTecnica { get; set; }
    }

    // ── DTO DE IMAGEN / EVIDENCIA DE OPORTUNIDAD (STORAGE EN BD) ──
    public class OportunidadImagenDto
    {
        public int Id { get; set; }
        public int OportunidadId { get; set; }
        public string NumeroRequerimiento { get; set; } = string.Empty;
        public string TipoEvidencia { get; set; } = string.Empty;
        public string NombreArchivo { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long TamanoBytes { get; set; }
        public string TamanoArchivo { get; set; } = string.Empty;
        public string? Comentario { get; set; }
        public string SubidoPor { get; set; } = string.Empty;
        public string? SubidoPorUsuarioId { get; set; }
        public DateTime FechaSubida { get; set; }
        public string Url { get; set; } = string.Empty;
    }

    public class SubirOportunidadImagenDto
    {
        [Required(ErrorMessage = "El tipo de evidencia es obligatorio.")]
        public string TipoEvidencia { get; set; } = string.Empty;

        public string? Comentario { get; set; }
    }
}

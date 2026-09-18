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

        [Required(ErrorMessage = "El acuerdo marco es obligatorio.")]
        public int AcuerdoMarcoId { get; set; }

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

        // Totales y estado
        public decimal LimiteTotal { get; set; }
        public string Estado { get; set; } = string.Empty;

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
    }
}

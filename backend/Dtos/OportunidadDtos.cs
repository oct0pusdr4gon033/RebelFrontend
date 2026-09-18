using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace RebelQueenBack.Application.Dtos
{
    // ── DTO DE CREACIÓN ──
    public class CrearOportunidadDto
    {
        [Required(ErrorMessage = "El número de requerimiento es obligatorio.")]
        public string NumeroRequerimiento { get; set; } = string.Empty;

        [Required(ErrorMessage = "El acuerdo marco es obligatorio.")]
        public Guid AcuerdoMarcoId { get; set; }

        [Required(ErrorMessage = "La fecha de vencimiento es obligatoria.")]
        public DateTime FechaVencimientoLicitacion { get; set; }

        [MinLength(1, ErrorMessage = "Debe asociar al menos una marca a la oportunidad.")]
        public List<Guid> MarcaIds { get; set; } = new();

        [MinLength(1, ErrorMessage = "Debe agregar al menos un producto a la oportunidad.")]
        public List<ProductoItemDto> Productos { get; set; } = new();
    }

    // ── DTO DE ACTUALIZACIÓN ──
    // OJO: REGLA DE NEGOCIO OBLIGATORIA:
    // 1. Datos de Convocatoria (NumeroRequerimiento, AcuerdoMarcoId, FechaVencimiento) -> NO SE EDITAN
    // 2. Marcas y Productos/Límites -> SE EDITAN
    public class ActualizarOportunidadDto
    {
        [MinLength(1, ErrorMessage = "Debe seleccionar al menos una marca.")]
        public List<Guid> MarcaIds { get; set; } = new();

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

    // ── DTO DE RESPUESTA ──
    public class OportunidadResponseDto
    {
        public Guid Id { get; set; }
        public string NumeroRequerimiento { get; set; } = string.Empty;
        public Guid AcuerdoMarcoId { get; set; }
        public string? AcuerdoMarcoCodigo { get; set; }
        public string? AcuerdoMarcoDescripcion { get; set; }
        public DateTime FechaVencimientoLicitacion { get; set; }
        public List<MarcaDto> Marcas { get; set; } = new();
        public List<ProductoResponseDto> Productos { get; set; } = new();
        public decimal LimiteTotal { get; set; }
        public string Estado { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class MarcaDto
    {
        public Guid Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class ProductoResponseDto
    {
        public Guid Id { get; set; }
        public string NumeroParte { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public int Cantidad { get; set; }
        public decimal LimiteUnitario { get; set; }
        public decimal LimiteSubtotal { get; set; }
    }
}

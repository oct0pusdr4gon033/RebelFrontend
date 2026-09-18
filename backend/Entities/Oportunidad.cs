using System;
using System.Collections.Generic;

namespace RebelQueenBack.Core.Entities
{
    /// <summary>
    /// Entidad de Oportunidad de Licitación en Perú Compras
    /// </summary>
    public class Oportunidad
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        // ── 1. DATOS DE LA CONVOCATORIA PERÚ COMPRAS (INMUTABLES TRAS LA CREACIÓN) ──
        public string NumeroRequerimiento { get; set; } = string.Empty; // Ej: REQ-001
        
        public Guid AcuerdoMarcoId { get; set; }
        public virtual AcuerdoMarco AcuerdoMarco { get; set; } = null!;

        public DateTime? FechaVencimientoLicitacion { get; set; }

        // ── 2. MARCAS Y PRODUCTOS / LÍMITES (EDITABLES) ──
        public virtual ICollection<OportunidadMarca> OportunidadMarcas { get; set; } = new List<OportunidadMarca>();
        public virtual ICollection<OportunidadProducto> Productos { get; set; } = new List<OportunidadProducto>();

        // Límite total calculado: Sum(Cantidad * LimiteUnitario)
        public decimal LimiteTotal { get; set; }

        // Estado: En Licitación, Por Vencer, Cotizada, Adjudicada, Desestimada
        public string Estado { get; set; } = "En Licitación";

        // Auditoría
        public string? CreadoPorUsuarioId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}

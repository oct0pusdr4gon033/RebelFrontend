using System;
using System.Collections.Generic;

namespace Domain.Models
{
    /// <summary>
    /// Oportunidad de Licitación en la plataforma Perú Compras
    /// </summary>
    public class Oportunidad
    {
        public int Id { get; set; }

        // ── 1. DATOS DE LA CONVOCATORIA PERÚ COMPRAS (INMUTABLES TRAS LA CREACIÓN) ──
        public string NumeroRequerimiento { get; set; } = string.Empty;

        public int AcuerdoMarcoId { get; set; }
        public virtual AcuerdoMarco? AcuerdoMarco { get; set; }

        public DateTime? FechaVencimientoLicitacion { get; set; }

        // ── 2. EMPRESA / CLIENTE SOLICITANTE (OPCIONAL PARA REGISTRO EXPRÉS) ──
        public int? EmpresaId { get; set; }
        public virtual Empresa? Empresa { get; set; }
        public string? EntidadConvocante { get; set; }

        // ── 3. MARCAS PARTICIPANTES Y PRODUCTOS / LÍMITES (EDITABLES) ──
        public virtual ICollection<OportunidadMarca> OportunidadMarcas { get; set; } = new List<OportunidadMarca>();
        public virtual ICollection<OportunidadProducto> Productos { get; set; } = new List<OportunidadProducto>();

        // Límite total de cotización en Soles: Sum(Cantidad * LimiteUnitario)
        public decimal LimiteTotal { get; set; }

        // Estado: "En Licitación", "Cotizada", "Ganada", "Desestimada"
        public string Estado { get; set; } = "En Licitación";

        // Auditoría
        public string? CreadoPorUsuarioId { get; set; }
        public virtual AppUser? CreadoPorUsuario { get; set; }
        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
        public DateTime? FechaActualizacion { get; set; }
    }
}

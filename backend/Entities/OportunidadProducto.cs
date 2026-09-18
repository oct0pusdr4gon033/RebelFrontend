using System;

namespace RebelQueenBack.Core.Entities
{
    /// <summary>
    /// Ítems y Productos asociados al requerimiento de la Oportunidad
    /// </summary>
    public class OportunidadProducto
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid OportunidadId { get; set; }
        public virtual Oportunidad Oportunidad { get; set; } = null!;

        // Número de parte (Requerido)
        public string NumeroParte { get; set; } = string.Empty;

        // Descripción del producto (Opcional si tiene número de parte)
        public string? Descripcion { get; set; }

        // Cantidad de unidades solicitadas en la convocatoria
        public int Cantidad { get; set; }

        // Límite unitario en Soles (S/) fijado por Perú Compras para este ítem
        public decimal LimiteUnitario { get; set; }

        // Subtotal del límite = Cantidad * LimiteUnitario
        public decimal LimiteSubtotal { get; set; }
    }
}

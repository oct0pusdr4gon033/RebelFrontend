using System;

namespace Domain.Models
{
    /// <summary>
    /// Productos e ítems del requerimiento de la Oportunidad
    /// </summary>
    public class OportunidadProducto
    {
        public int Id { get; set; }

        public int OportunidadId { get; set; }
        public virtual Oportunidad Oportunidad { get; set; } = null!;

        // Número de parte del producto (Requerido)
        public string NumeroParte { get; set; } = string.Empty;

        // Descripción detallada del producto (Opcional si solo tiene número de parte)
        public string? Descripcion { get; set; }

        // Cantidad de unidades requeridas
        public int Cantidad { get; set; }

        // Límite unitario en Soles (S/) fijado por Perú Compras para este ítem
        public decimal LimiteUnitario { get; set; }

        // Subtotal del límite: Cantidad * LimiteUnitario
        public decimal LimiteSubtotal { get; set; }
    }
}

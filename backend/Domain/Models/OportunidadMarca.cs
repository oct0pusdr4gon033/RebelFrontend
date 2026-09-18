using System;

namespace Domain.Models
{
    /// <summary>
    /// Relación Muchos a Muchos entre Oportunidad y Marca
    /// Permite asociar una o múltiples marcas con las cuales se cotizará la licitación
    /// </summary>
    public class OportunidadMarca
    {
        public int OportunidadId { get; set; }
        public virtual Oportunidad Oportunidad { get; set; } = null!;

        public int MarcaId { get; set; }
        public virtual Marca Marca { get; set; } = null!;
    }
}

using System;

namespace RebelQueenBack.Core.Entities
{
    /// <summary>
    /// Relación Muchos a Muchos entre Oportunidad y Marcas participantes
    /// </summary>
    public class OportunidadMarca
    {
        public Guid OportunidadId { get; set; }
        public virtual Oportunidad Oportunidad { get; set; } = null!;

        public Guid MarcaId { get; set; }
        public virtual Marca Marca { get; set; } = null!;
    }
}

using System;
using System.Collections.Generic;

namespace Domain.Models
{
    /// <summary>
    /// Catálogo de Marcas disponibles para cotizar
    /// </summary>
    public class Marca
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public bool Activo { get; set; } = true;
    }
}

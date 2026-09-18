using System;
using System.Collections.Generic;

namespace Domain.Models
{
    /// <summary>
    /// Sede de la empresa (sucursal / oficina).
    /// Usa soft-delete mediante la propiedad Activo.
    /// </summary>
    public class Sede
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? Ubicacion { get; set; }   // Ciudad / Región

        public string? Direccion { get; set; }   // Dirección física

        public string? Telefono { get; set; }

        public string? Email { get; set; }

        /// <summary>false = eliminado lógicamente.</summary>
        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime? FechaActualizacion { get; set; }

        // Empleados asignados a esta sede
        public virtual ICollection<Empleado> Empleados { get; set; } = new List<Empleado>();
    }
}

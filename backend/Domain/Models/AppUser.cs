using System;
using Microsoft.AspNetCore.Identity;

namespace Domain.Models
{
    /// <summary>
    /// Usuario del sistema — extiende IdentityUser con campos propios.
    /// </summary>
    public class AppUser : IdentityUser
    {
        /// <summary>Nombre visible del usuario en la UI.</summary>
        public string NombreCompleto { get; set; } = string.Empty;

        /// <summary>Si false, el usuario está inhabilitado (soft-delete).</summary>
        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        // Relación 1:1 con Empleado
        public virtual Empleado? Empleado { get; set; }
    }
}

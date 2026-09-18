using Microsoft.AspNetCore.Identity;

namespace Domain.Models
{
    /// <summary>
    /// Rol del sistema — extiende IdentityRole.
    /// </summary>
    public class Rol : IdentityRole
    {
        public string? Descripcion { get; set; }
        public bool Activo { get; set; } = true;
    }
}

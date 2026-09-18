using System;
namespace Domain.Models
{
    /// <summary>
    /// Empleado de la empresa.
    /// Usa soft-delete mediante la propiedad Activo.
    /// Se vincula opcionalmente a un usuario del sistema (AppUser).
    /// </summary>
    public class Empleado
    {
        public int Id { get; set; }

        public string Nombres { get; set; } = string.Empty;

        public string Apellidos { get; set; } = string.Empty;

        public string NombreCompleto => $"{Nombres} {Apellidos}".Trim();

        public string Dni { get; set; } = string.Empty;

        public string Cargo { get; set; } = string.Empty;

        public string? Telefono { get; set; }

        public string? Email { get; set; }

        public DateTime FechaIngreso { get; set; } = DateTime.UtcNow;

        /// <summary>false = eliminado lógicamente.</summary>
        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime? FechaActualizacion { get; set; }

        // Sede a la que pertenece (opcional)
        public int? SedeId { get; set; }
        public virtual Sede? Sede { get; set; }

        // Usuario del sistema vinculado (opcional, 1:1)
        public string? UserId { get; set; }
        public virtual AppUser? User { get; set; }
    }
}

using System;
using System.ComponentModel.DataAnnotations;

namespace Domain.DTOs.Empresa
{
    // ── USUARIO DTOs ───────────────────────────────────────────────────────────

    public class UsuarioDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public DateTime FechaCreacion { get; set; }

        // Rol asignado
        public string? RolId { get; set; }
        public string? RolNombre { get; set; }

        // Empleado vinculado
        public int? EmpleadoId { get; set; }
        public string? EmpleadoNombreCompleto { get; set; }
        public string? EmpleadoDni { get; set; }

        // Sede (heredada del empleado)
        public int? SedeId { get; set; }
        public string? SedeNombre { get; set; }
    }

    public class CrearUsuarioRequest
    {
        [Required(ErrorMessage = "El email es obligatorio.")]
        [EmailAddress(ErrorMessage = "Formato de email inválido.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre completo es obligatorio.")]
        [MaxLength(200)]
        public string NombreCompleto { get; set; } = string.Empty;

        [Required(ErrorMessage = "El rol es obligatorio.")]
        public string RolId { get; set; } = string.Empty;

        /// <summary>Si se provee, vincula el usuario a ese empleado existente.</summary>
        public int? EmpleadoId { get; set; }

        /// <summary>Si no se vincula a empleado, se puede asignar una sede directamente.</summary>
        public int? SedeId { get; set; }
    }

    public class ActualizarUsuarioRequest
    {
        [Required(ErrorMessage = "El nombre completo es obligatorio.")]
        [MaxLength(200)]
        public string NombreCompleto { get; set; } = string.Empty;

        /// <summary>Si se provee, cambia el rol del usuario.</summary>
        public string? RolId { get; set; }

        /// <summary>Si se provee, vincula / cambia el empleado asociado.</summary>
        public int? EmpleadoId { get; set; }

        public int? SedeId { get; set; }

        public bool Activo { get; set; } = true;
    }

    public class RolDto
    {
        public string Id { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public bool Activo { get; set; }
    }
}

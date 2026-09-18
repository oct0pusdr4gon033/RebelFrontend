using System;
using System.ComponentModel.DataAnnotations;

namespace Domain.DTOs.Empresa
{
    // ── EMPLEADO DTOs ──────────────────────────────────────────────────────────

    public class EmpleadoDto
    {
        public int Id { get; set; }
        public string Nombres { get; set; } = string.Empty;
        public string Apellidos { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public string Dni { get; set; } = string.Empty;
        public string Cargo { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public DateTime FechaIngreso { get; set; }
        public bool Activo { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime? FechaActualizacion { get; set; }

        // Sede vinculada
        public int? SedeId { get; set; }
        public string? SedeNombre { get; set; }
        public string? SedeUbicacion { get; set; }

        // Usuario del sistema vinculado
        public string? UserId { get; set; }
        public string? UserEmail { get; set; }
        public string? UserNombre { get; set; }
        public string? RolNombre { get; set; }
    }

    public class CrearEmpleadoRequest
    {
        [Required(ErrorMessage = "Los nombres son obligatorios.")]
        [MaxLength(100)]
        public string Nombres { get; set; } = string.Empty;

        [Required(ErrorMessage = "Los apellidos son obligatorios.")]
        [MaxLength(100)]
        public string Apellidos { get; set; } = string.Empty;

        [Required(ErrorMessage = "El DNI es obligatorio.")]
        [MaxLength(20)]
        public string Dni { get; set; } = string.Empty;

        [Required(ErrorMessage = "El cargo es obligatorio.")]
        [MaxLength(100)]
        public string Cargo { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? Telefono { get; set; }

        [MaxLength(100)]
        [EmailAddress(ErrorMessage = "Formato de email inválido.")]
        public string? Email { get; set; }

        public DateTime? FechaIngreso { get; set; }

        public int? SedeId { get; set; }
    }

    public class ActualizarEmpleadoRequest
    {
        [Required(ErrorMessage = "Los nombres son obligatorios.")]
        [MaxLength(100)]
        public string Nombres { get; set; } = string.Empty;

        [Required(ErrorMessage = "Los apellidos son obligatorios.")]
        [MaxLength(100)]
        public string Apellidos { get; set; } = string.Empty;

        [Required(ErrorMessage = "El DNI es obligatorio.")]
        [MaxLength(20)]
        public string Dni { get; set; } = string.Empty;

        [Required(ErrorMessage = "El cargo es obligatorio.")]
        [MaxLength(100)]
        public string Cargo { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? Telefono { get; set; }

        [MaxLength(100)]
        [EmailAddress(ErrorMessage = "Formato de email inválido.")]
        public string? Email { get; set; }

        public DateTime? FechaIngreso { get; set; }

        public int? SedeId { get; set; }
    }
}

using System;
using System.ComponentModel.DataAnnotations;

namespace Domain.DTOs.Empresa
{
    // ── SEDE DTOs ──────────────────────────────────────────────────────────────

    public class SedeDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Ubicacion { get; set; }
        public string? Direccion { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public bool Activo { get; set; }
        public int TotalEmpleados { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime? FechaActualizacion { get; set; }
    }

    public class CrearSedeRequest
    {
        [Required(ErrorMessage = "El nombre de la sede es obligatorio.")]
        [MaxLength(150)]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Ubicacion { get; set; }

        [MaxLength(300)]
        public string? Direccion { get; set; }

        [MaxLength(30)]
        public string? Telefono { get; set; }

        [MaxLength(100)]
        [EmailAddress(ErrorMessage = "Formato de email inválido.")]
        public string? Email { get; set; }
    }

    public class ActualizarSedeRequest
    {
        [Required(ErrorMessage = "El nombre de la sede es obligatorio.")]
        [MaxLength(150)]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Ubicacion { get; set; }

        [MaxLength(300)]
        public string? Direccion { get; set; }

        [MaxLength(30)]
        public string? Telefono { get; set; }

        [MaxLength(100)]
        [EmailAddress(ErrorMessage = "Formato de email inválido.")]
        public string? Email { get; set; }
    }
}

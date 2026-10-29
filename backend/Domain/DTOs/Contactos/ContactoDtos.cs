using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Domain.DTOs.Contactos
{
    public class PersonaContactoItemDto
    {
        [Required(ErrorMessage = "El número de teléfono/contacto es obligatorio.")]
        [MaxLength(50)]
        public string ContactoNumero { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre del contacto es obligatorio.")]
        [MaxLength(200)]
        public string ContactoNombre { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? ContactoAreaCargo { get; set; }
    }

    public class CrearContactoOCAMDto
    {
        /// <summary>Opcional cuando se registra un contacto sin número de OCAM relacionada.</summary>
        [MaxLength(100)]
        public string? NumeroOCAM { get; set; }

        public bool SinOcamRelacionada { get; set; }

        [MaxLength(20)]
        public string? RucEntidad { get; set; }

        public int? OportunidadId { get; set; }
        public int? OrdenCompraId { get; set; }

        [MaxLength(50)]
        public string? ContactoNumero { get; set; }

        [MaxLength(200)]
        public string? ContactoNombre { get; set; }

        [MaxLength(200)]
        public string? ContactoAreaCargo { get; set; }

        public string? ContactoMotivo { get; set; }

        public string? Respuesta { get; set; }

        [MaxLength(100)]
        public string? TipoRelacion { get; set; }

        [Required(ErrorMessage = "El nombre de la entidad o empresa relacionada es obligatorio.")]
        [MaxLength(250)]
        public string EmpresaRelacionada { get; set; } = string.Empty;

        public int? EmpresaId { get; set; }

        /// <summary>
        /// Lista de contactos cuando se agregan varios contactos en un mismo registro.
        /// </summary>
        public List<PersonaContactoItemDto>? Contactos { get; set; }
    }

    public class ContactoOCAMResponseDto
    {
        public int Id { get; set; }
        public string NumeroOCAM { get; set; } = string.Empty;
        public bool SinOcamRelacionada { get; set; }
        public string? RucEntidad { get; set; }
        public int? OportunidadId { get; set; }
        public int? OrdenCompraId { get; set; }
        public string ContactoNumero { get; set; } = string.Empty;
        public string ContactoNombre { get; set; } = string.Empty;
        public string ContactoAreaCargo { get; set; } = string.Empty;
        public string ContactoMotivo { get; set; } = string.Empty;
        public string Respuesta { get; set; } = string.Empty;
        public string TipoRelacion { get; set; } = string.Empty;
        public string EmpresaRelacionada { get; set; } = string.Empty;
        public int? EmpresaId { get; set; }
        public string? GrupoRegistroId { get; set; }
        public List<PersonaContactoItemDto>? ContactosRegistrados { get; set; }
        public string RegistradoPor { get; set; } = string.Empty;
        public string? RegistradoPorUsuarioId { get; set; }
        public DateTime FechaRegistro { get; set; }
        public bool EsInmutable { get; set; } = true;
    }

    public class FiltroContactoOCAMDto
    {
        public string? NumeroOCAM { get; set; }
        public string? RucEntidad { get; set; }
        public string? EmpresaRelacionada { get; set; }
        public string? TipoRelacion { get; set; }
        public string? Busqueda { get; set; }
    }
}

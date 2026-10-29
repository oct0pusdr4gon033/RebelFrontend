using System;

namespace Domain.Models
{
    /// <summary>
    /// Registro inmutable de contacto y trazabilidad vinculado opcionalmente a una Orden de Compra Oficial (OCAM)
    /// o registrado directamente con Contacto, RUC y Nombre de la Entidad.
    /// Soporta registro individual y múltiple (varios contactos por registro).
    /// </summary>
    public class ContactoOCAM
    {
        public int Id { get; set; }

        /// <summary>Número de OCAM (ej: OCAM-2026-0001092) o "SIN OCAM" cuando se registra sin OCAM relacionada.</summary>
        public string NumeroOCAM { get; set; } = "SIN OCAM";

        /// <summary>Indica si el contacto fue registrado sin número de OCAM relacionada.</summary>
        public bool SinOcamRelacionada { get; set; }

        /// <summary>RUC de la entidad o empresa relacionada (ej: 20131370998).</summary>
        public string? RucEntidad { get; set; }

        // Vínculo opcional con Oportunidad y Orden de Compra
        public int? OportunidadId { get; set; }
        public virtual Oportunidad? Oportunidad { get; set; }

        public int? OrdenCompraId { get; set; }
        public virtual OrdenCompra? OrdenCompra { get; set; }

        /// <summary>Número de teléfono o celular del contacto (ej: 900900900).</summary>
        public string ContactoNumero { get; set; } = string.Empty;

        /// <summary>Nombre y apellido del contacto (ej: JERRY MEDRANO).</summary>
        public string ContactoNombre { get; set; } = string.Empty;

        /// <summary>Área y cargo del contacto (ej: LOGISTICA - JEFE DE LOGISTICA).</summary>
        public string ContactoAreaCargo { get; set; } = string.Empty;

        /// <summary>Motivo o descripción de la llamada/contacto.</summary>
        public string ContactoMotivo { get; set; } = string.Empty;

        /// <summary>Respuesta obtenida.</summary>
        public string Respuesta { get; set; } = string.Empty;

        /// <summary>
        /// Clasificación de la relación:
        /// - Entidad Solicitante
        /// - Entidad / Marca de Cotización
        /// - Relación Exterior
        /// </summary>
        public string TipoRelacion { get; set; } = "Entidad Solicitante";

        /// <summary>Nombre de la empresa o entidad relacionada.</summary>
        public string EmpresaRelacionada { get; set; } = string.Empty;

        public int? EmpresaId { get; set; }
        public virtual Empresa? Empresa { get; set; }

        /// <summary>Identificador común cuando se registran varios contactos en una misma operación.</summary>
        public string? GrupoRegistroId { get; set; }

        /// <summary>JSON opcional con el listado de contactos hermanos registrados en el mismo lote.</summary>
        public string? ContactosAdicionalesJson { get; set; }

        // Auditoría y Trazabilidad (Inmutable)
        public string RegistradoPor { get; set; } = string.Empty;
        public string? RegistradoPorUsuarioId { get; set; }
        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
        public bool EsInmutable { get; set; } = true;
    }
}

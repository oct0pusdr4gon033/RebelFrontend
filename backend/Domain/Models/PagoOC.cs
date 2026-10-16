using System;

namespace Domain.Models
{
    /// <summary>
    /// Pago o desembolso financiero vinculado a una Orden de Compra (OCAM / Perú Compras).
    /// </summary>
    public class PagoOC
    {
        public int Id { get; set; }

        /// <summary>Código correlativo único del pago (ej. PAG-2026-0001).</summary>
        public string CodigoPago { get; set; } = string.Empty;

        // ── Relación con Oportunidad ──
        public int OportunidadId { get; set; }
        public virtual Oportunidad? Oportunidad { get; set; }

        // ── Relación opcional con Orden de Compra ──
        public int? OrdenCompraId { get; set; }
        public virtual OrdenCompra? OrdenCompra { get; set; }

        public string NumeroOC { get; set; } = string.Empty;
        public string NumeroRequerimiento { get; set; } = string.Empty;
        public string? EmpresaRazonSocial { get; set; }
        public string? EntidadConvocante { get; set; }

        /// <summary>Concepto: Flete, Comisión, Gastos Varios, Mercadería / Proveedor, Adelanto, etc.</summary>
        public string Concepto { get; set; } = string.Empty;

        /// <summary>Detalle ampliado (ej. producto individual, plazo o proveedor).</summary>
        public string? ConceptoPersonalizado { get; set; }

        public decimal Monto { get; set; }
        public string Moneda { get; set; } = "PEN"; // PEN | USD

        public DateTime FechaPago { get; set; }
        public string MetodoPago { get; set; } = "Transferencia Bancaria";
        public string? Banco { get; set; }
        public string? NumeroOperacion { get; set; }
        public string? Beneficiario { get; set; }
        public string? Notas { get; set; }

        // ── Comprobante / Voucher Digital ──
        public string? ComprobanteNombreArchivo { get; set; }
        public long ComprobanteTamanoBytes { get; set; }
        public string? ComprobanteContentType { get; set; }
        public string? ComprobanteDataUrl { get; set; }
        public int? ComprobanteBackendImagenId { get; set; }
        public string? ComprobanteBackendUrl { get; set; }

        // ── Auditoría y Usuario ──
        public string RegistradoPor { get; set; } = string.Empty;
        public string? RegistradoPorEmail { get; set; }
        public string? CreadoPorUsuarioId { get; set; }
        public virtual AppUser? CreadoPorUsuario { get; set; }
        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;

        /// <summary>Estado del pago: Registrado, Conciliado, Observado, Anulado</summary>
        public string Estado { get; set; } = "Registrado";
    }
}

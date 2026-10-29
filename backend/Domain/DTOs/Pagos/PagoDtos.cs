using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Domain.DTOs.Pagos
{
    public class RegistrarPagoDto
    {
        [Required(ErrorMessage = "El ID de la oportunidad es obligatorio.")]
        public int OportunidadId { get; set; }

        public int? OrdenCompraId { get; set; }

        [Required(ErrorMessage = "El número de Orden de Compra es obligatorio.")]
        public string NumeroOC { get; set; } = string.Empty;

        [Required(ErrorMessage = "El número de requerimiento es obligatorio.")]
        public string NumeroRequerimiento { get; set; } = string.Empty;

        public string? EmpresaRazonSocial { get; set; }
        public string? EntidadConvocante { get; set; }

        [Required(ErrorMessage = "El concepto de pago es obligatorio.")]
        public string Concepto { get; set; } = string.Empty;

        public string? ConceptoPersonalizado { get; set; }

        [Required(ErrorMessage = "El monto es obligatorio.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto a pagar debe ser mayor a 0.")]
        public decimal Monto { get; set; }

        public decimal? MontoAjusteFlete { get; set; }

        [RegularExpression("^(PEN|USD)$", ErrorMessage = "Moneda inválida. Valores permitidos: PEN, USD.")]
        public string Moneda { get; set; } = "PEN";

        [Required(ErrorMessage = "La fecha de pago es obligatoria.")]
        public DateTime FechaPago { get; set; }

        public DateTime? FechaVencimientoOC { get; set; }
        public string MetodoPago { get; set; } = "Transferencia Bancaria";
        public string? Banco { get; set; }
        public string? EntidadCorrespondiente { get; set; }
        public string? NumeroCuentaBancaria { get; set; }
        public string? TitularCuenta { get; set; }
        public string? Beneficiario { get; set; }
        public string? NumeroOperacion { get; set; }
        public string? HoraPago { get; set; }
        public string? Notas { get; set; }

        // Voucher / Comprobante
        public string? ComprobanteNombreArchivo { get; set; }
        public long ComprobanteTamanoBytes { get; set; }
        public string? ComprobanteContentType { get; set; }
        public string? ComprobanteDataUrl { get; set; }
        public int? ComprobanteBackendImagenId { get; set; }
        public string? ComprobanteBackendUrl { get; set; }

        public string? Estado { get; set; }
        public string? RegistradoPor { get; set; }
        public string? RegistradoPorEmail { get; set; }
    }

    public class ResolverPagoAdminDto
    {
        [Required(ErrorMessage = "El estado de resolución del pago es obligatorio.")]
        public string Estado { get; set; } = "En Revisión";
        public string? NumeroOperacion { get; set; }
        public string? HoraPago { get; set; }
        public string? JustificacionCorreccion { get; set; }
        public string? ComprobanteNombreArchivo { get; set; }
        public long ComprobanteTamanoBytes { get; set; }
        public string? ComprobanteContentType { get; set; }
        public string? ComprobanteDataUrl { get; set; }
        public int? ComprobanteBackendImagenId { get; set; }
        public string? ComprobanteBackendUrl { get; set; }
        public string? ResueltoPorAdmin { get; set; }
    }

    public class CorregirPagoDto
    {
        public DateTime? FechaVencimientoOC { get; set; }
        public string? NumeroCuentaBancaria { get; set; }
        public string? EntidadCorrespondiente { get; set; }
        public string? Banco { get; set; }
        public string? TitularCuenta { get; set; }
        public string? Beneficiario { get; set; }
        public string? Concepto { get; set; }
        public string? ConceptoPersonalizado { get; set; }
        public decimal Monto { get; set; }
        public decimal? MontoAjusteFlete { get; set; }
        public string? Moneda { get; set; }
        public DateTime? FechaPago { get; set; }
        public string? MetodoPago { get; set; }
        public string? Notas { get; set; }
    }

    public class ComprobanteResponseDto
    {
        public string NombreArchivo { get; set; } = string.Empty;
        public long TamanoBytes { get; set; }
        public string TamanoFormateado { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public string DataUrl { get; set; } = string.Empty;
        public int? BackendImagenId { get; set; }
        public string? BackendUrl { get; set; }
        public DateTime FechaSubida { get; set; }
    }

    public class PagoResponseDto
    {
        public int Id { get; set; }
        public string CodigoPago { get; set; } = string.Empty;
        public int OportunidadId { get; set; }
        public int? OrdenCompraId { get; set; }
        public string NumeroOC { get; set; } = string.Empty;
        public string NumeroRequerimiento { get; set; } = string.Empty;
        public string? EmpresaRazonSocial { get; set; }
        public string? EntidadConvocante { get; set; }
        public string Concepto { get; set; } = string.Empty;
        public string? ConceptoPersonalizado { get; set; }
        public decimal Monto { get; set; }
        public decimal? MontoAjusteFlete { get; set; }
        public string Moneda { get; set; } = "PEN";
        public string FechaPago { get; set; } = string.Empty;
        public string? FechaVencimientoOC { get; set; }
        public string MetodoPago { get; set; } = string.Empty;
        public string? Banco { get; set; }
        public string? EntidadCorrespondiente { get; set; }
        public string? NumeroCuentaBancaria { get; set; }
        public string? TitularCuenta { get; set; }
        public string? Beneficiario { get; set; }
        public string? NumeroOperacion { get; set; }
        public string? HoraPago { get; set; }
        public string? Notas { get; set; }
        public ComprobanteResponseDto Comprobante { get; set; } = new ComprobanteResponseDto();
        public string RegistradoPor { get; set; } = string.Empty;
        public string? RegistradoPorEmail { get; set; }
        public DateTime FechaRegistro { get; set; }
        public string Estado { get; set; } = "En Revisión";
        public string? JustificacionCorreccion { get; set; }
        public string? ResueltoPorAdmin { get; set; }
        public DateTime? FechaResolucionAdmin { get; set; }
    }

    public class LiquidacionOCResponseDto
    {
        public string NumeroOC { get; set; } = string.Empty;
        public string NumeroRequerimiento { get; set; } = string.Empty;
        public string EmpresaRazonSocial { get; set; } = string.Empty;
        public decimal MontoTotalOC { get; set; }
        public decimal TotalAjusteFlete { get; set; }
        public decimal MontoTechoConAjustes { get; set; }
        public decimal TotalPagado { get; set; }
        public decimal SaldoPendiente { get; set; }
        public int TotalPagos { get; set; }
        public string Moneda { get; set; } = "PEN";
        public List<PagoResponseDto> Pagos { get; set; } = new List<PagoResponseDto>();
    }
}

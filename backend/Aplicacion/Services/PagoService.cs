using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Domain.DTOs.Pagos;
using Domain.Interfaces.Repositories;
using Domain.Interfaces.Services;
using Domain.Models;

namespace Aplicacion.Services
{
    public class PagoService : IPagoService
    {
        private readonly IPagoRepository _pagoRepository;
        private readonly IOportunidadRepository _oportunidadRepository;

        public PagoService(
            IPagoRepository pagoRepository,
            IOportunidadRepository oportunidadRepository)
        {
            _pagoRepository = pagoRepository;
            _oportunidadRepository = oportunidadRepository;
        }

        public async Task<IEnumerable<PagoResponseDto>> ObtenerTodosAsync()
        {
            var pagos = await _pagoRepository.ObtenerTodosAsync();
            return pagos.Select(MapToResponseDto);
        }

        public async Task<PagoResponseDto?> ObtenerPorIdAsync(int id)
        {
            var pago = await _pagoRepository.ObtenerPorIdAsync(id);
            return pago == null ? null : MapToResponseDto(pago);
        }

        public async Task<IEnumerable<PagoResponseDto>> ObtenerPorOCAsync(string numeroOC)
        {
            var pagos = await _pagoRepository.ObtenerPorOCAsync(numeroOC);
            return pagos.Select(MapToResponseDto);
        }

        public async Task<PagoResponseDto> RegistrarPagoAsync(RegistrarPagoDto dto, string? usuarioId = null)
        {
            // 1. Validar existencia de la oportunidad vinculada
            var oportunidad = await _oportunidadRepository.ObtenerPorIdAsync(dto.OportunidadId);
            if (oportunidad == null)
            {
                throw new InvalidOperationException($"No se encontró la oportunidad con ID #{dto.OportunidadId}.");
            }

            // 2. Control del Techo Presupuestal de la OCAM de Perú Compras
            decimal techoOCAM = 0;
            if (oportunidad.OrdenCompra?.MontoOCAM != null && oportunidad.OrdenCompra.MontoOCAM > 0)
            {
                techoOCAM = oportunidad.OrdenCompra.MontoOCAM.Value;
            }
            else if (oportunidad.LimiteTotal > 0)
            {
                techoOCAM = oportunidad.LimiteTotal;
            }

            if (techoOCAM > 0)
            {
                var pagosPrevios = await _pagoRepository.ObtenerPorOportunidadIdAsync(dto.OportunidadId);
                var totalPrevio = pagosPrevios
                    .Where(p => p.Moneda == "PEN" && p.Estado != "Anulado")
                    .Sum(p => p.Monto);

                var proyectado = totalPrevio + (dto.Moneda == "PEN" ? dto.Monto : 0);
                if (proyectado > techoOCAM + 0.05m)
                {
                    decimal disponible = Math.Max(0, techoOCAM - totalPrevio);
                    throw new InvalidOperationException(
                        $"El pago solicitado excede el techo de la Orden de Compra (OCAM). " +
                        $"Techo OCAM: S/ {techoOCAM:N2}, Acumulado previo: S/ {totalPrevio:N2}, " +
                        $"Nuevo pago: S/ {dto.Monto:N2}. Saldo disponible restante: S/ {disponible:N2}."
                    );
                }
            }

            // 3. Crear entidad PagoOC
            var nuevoPago = new PagoOC
            {
                OportunidadId = dto.OportunidadId,
                OrdenCompraId = dto.OrdenCompraId ?? oportunidad.OrdenCompra?.Id,
                NumeroOC = string.IsNullOrWhiteSpace(dto.NumeroOC)
                    ? (oportunidad.OrdenCompra?.NumeroOC ?? $"OC-REQ-{oportunidad.NumeroRequerimiento}")
                    : dto.NumeroOC.Trim(),
                NumeroRequerimiento = dto.NumeroRequerimiento.Trim(),
                EmpresaRazonSocial = dto.EmpresaRazonSocial ?? oportunidad.Empresa?.RazonSocial ?? oportunidad.EntidadConvocante,
                EntidadConvocante = dto.EntidadConvocante ?? oportunidad.EntidadConvocante,
                Concepto = dto.Concepto.Trim(),
                ConceptoPersonalizado = dto.ConceptoPersonalizado?.Trim(),
                Monto = dto.Monto,
                Moneda = dto.Moneda.ToUpperInvariant(),
                FechaPago = DateTime.SpecifyKind(dto.FechaPago, DateTimeKind.Utc),
                MetodoPago = dto.MetodoPago.Trim(),
                Banco = dto.Banco?.Trim(),
                NumeroOperacion = dto.NumeroOperacion?.Trim(),
                Beneficiario = dto.Beneficiario?.Trim(),
                Notas = dto.Notas?.Trim(),
                ComprobanteNombreArchivo = dto.ComprobanteNombreArchivo,
                ComprobanteTamanoBytes = dto.ComprobanteTamanoBytes,
                ComprobanteContentType = dto.ComprobanteContentType ?? "image/jpeg",
                ComprobanteDataUrl = dto.ComprobanteDataUrl,
                RegistradoPor = !string.IsNullOrWhiteSpace(dto.RegistradoPor) ? dto.RegistradoPor : "Usuario de Ventas",
                RegistradoPorEmail = dto.RegistradoPorEmail,
                CreadoPorUsuarioId = usuarioId,
                FechaRegistro = DateTime.UtcNow,
                Estado = "Registrado"
            };

            var creado = await _pagoRepository.CrearAsync(nuevoPago);
            return MapToResponseDto(creado);
        }

        public async Task<bool> EliminarPagoAsync(int id)
        {
            return await _pagoRepository.EliminarAsync(id);
        }

        public async Task<LiquidacionOCResponseDto> ObtenerLiquidacionPorOCAsync(string numeroOC)
        {
            var pagos = await _pagoRepository.ObtenerPorOCAsync(numeroOC);
            var listaDto = pagos.Select(MapToResponseDto).ToList();

            var primerPago = pagos.FirstOrDefault();
            decimal montoTotalOC = 0;
            string razonSocial = primerPago?.EmpresaRazonSocial ?? primerPago?.EntidadConvocante ?? "";
            string req = primerPago?.NumeroRequerimiento ?? "";

            if (primerPago?.OportunidadId > 0)
            {
                var op = await _oportunidadRepository.ObtenerPorIdAsync(primerPago.OportunidadId);
                if (op != null)
                {
                    montoTotalOC = op.OrdenCompra?.MontoOCAM ?? op.LimiteTotal;
                    if (string.IsNullOrEmpty(razonSocial))
                    {
                        razonSocial = op.Empresa?.RazonSocial ?? op.EntidadConvocante ?? "";
                    }
                    if (string.IsNullOrEmpty(req))
                    {
                        req = op.NumeroRequerimiento;
                    }
                }
            }

            var totalPagado = listaDto
                .Where(p => p.Moneda == "PEN" && p.Estado != "Anulado")
                .Sum(p => p.Monto);

            return new LiquidacionOCResponseDto
            {
                NumeroOC = numeroOC,
                NumeroRequerimiento = req,
                EmpresaRazonSocial = razonSocial,
                MontoTotalOC = montoTotalOC,
                TotalPagado = totalPagado,
                SaldoPendiente = Math.Max(0, montoTotalOC - totalPagado),
                TotalPagos = listaDto.Count,
                Moneda = "PEN",
                Pagos = listaDto
            };
        }

        // ── Helper de mapeo a DTO ──
        private static PagoResponseDto MapToResponseDto(PagoOC p)
        {
            string tamanoFormateado = "0 B";
            if (p.ComprobanteTamanoBytes > 0)
            {
                double k = 1024;
                if (p.ComprobanteTamanoBytes < k)
                    tamanoFormateado = $"{p.ComprobanteTamanoBytes} B";
                else if (p.ComprobanteTamanoBytes < k * k)
                    tamanoFormateado = $"{(p.ComprobanteTamanoBytes / k):F1} KB";
                else
                    tamanoFormateado = $"{(p.ComprobanteTamanoBytes / (k * k)):F2} MB";
            }

            return new PagoResponseDto
            {
                Id = p.Id,
                CodigoPago = p.CodigoPago,
                OportunidadId = p.OportunidadId,
                OrdenCompraId = p.OrdenCompraId,
                NumeroOC = p.NumeroOC,
                NumeroRequerimiento = p.NumeroRequerimiento,
                EmpresaRazonSocial = p.EmpresaRazonSocial,
                EntidadConvocante = p.EntidadConvocante,
                Concepto = p.Concepto,
                ConceptoPersonalizado = p.ConceptoPersonalizado,
                Monto = p.Monto,
                Moneda = p.Moneda,
                FechaPago = p.FechaPago.ToString("yyyy-MM-dd"),
                MetodoPago = p.MetodoPago,
                Banco = p.Banco,
                NumeroOperacion = p.NumeroOperacion,
                Beneficiario = p.Beneficiario,
                Notas = p.Notas,
                Comprobante = new ComprobanteResponseDto
                {
                    NombreArchivo = p.ComprobanteNombreArchivo ?? "comprobante.jpg",
                    TamanoBytes = p.ComprobanteTamanoBytes,
                    TamanoFormateado = tamanoFormateado,
                    ContentType = p.ComprobanteContentType ?? "image/jpeg",
                    DataUrl = p.ComprobanteDataUrl ?? "",
                    BackendImagenId = p.ComprobanteBackendImagenId,
                    BackendUrl = p.ComprobanteBackendUrl,
                    FechaSubida = p.FechaRegistro
                },
                RegistradoPor = p.RegistradoPor,
                RegistradoPorEmail = p.RegistradoPorEmail,
                FechaRegistro = p.FechaRegistro,
                Estado = p.Estado
            };
        }
    }
}

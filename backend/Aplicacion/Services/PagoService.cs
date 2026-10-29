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

        private static decimal CalcularAjusteFleteOportunidad(Oportunidad oportunidad, decimal? montoAjusteManual = null)
        {
            decimal totalItemsAjuste = 0;
            if (oportunidad.Productos != null)
            {
                foreach (var prod in oportunidad.Productos)
                {
                    decimal pct = 0;
                    if (prod.AjusteFletePorcentaje.HasValue && prod.AjusteFletePorcentaje.Value > 0)
                    {
                        pct = prod.AjusteFletePorcentaje.Value;
                    }
                    else if (prod.AjusteFleteEstado != "Rechazado" && prod.AjusteFleteSolicitadoPorcentaje.HasValue && prod.AjusteFleteSolicitadoPorcentaje.Value > 0)
                    {
                        pct = prod.AjusteFleteSolicitadoPorcentaje.Value;
                    }

                    decimal ajusteProd = (prod.LimiteUnitario * pct / 100m) * prod.Cantidad;
                    if (ajusteProd <= 0 && prod.Proveedores != null && prod.Proveedores.Any())
                    {
                        ajusteProd = prod.Proveedores.Sum(pv => pv.CostoEnvio);
                    }
                    totalItemsAjuste += ajusteProd;
                }
            }

            if (montoAjusteManual.HasValue && montoAjusteManual.Value > totalItemsAjuste)
            {
                return montoAjusteManual.Value;
            }
            return totalItemsAjuste;
        }

        private static bool EsConceptoFlete(string? concepto, string? conceptoPersonalizado)
        {
            var c = (concepto ?? "").Trim().ToLowerInvariant();
            var cp = (conceptoPersonalizado ?? "").Trim().ToLowerInvariant();
            return c.Contains("flete") || c.Contains("transporte") || cp.Contains("flete") || cp.Contains("transporte");
        }

        private static bool CuentaEnAcumulado(string? estado)
        {
            if (string.IsNullOrWhiteSpace(estado)) return true;
            var e = estado.Trim().ToLowerInvariant();
            return e != "anulado" && e != "pago rechazado" && e != "rechazado";
        }

        private async Task ValidarLimitesFinancierosAsync(
            Oportunidad oportunidad,
            decimal montoSolicitado,
            string moneda,
            string concepto,
            string? conceptoPersonalizado,
            decimal? montoAjusteFleteDto,
            int? excluirPagoId = null)
        {
            if (!string.Equals(moneda, "PEN", StringComparison.OrdinalIgnoreCase))
                return;

            decimal montoBaseOC = 0;
            if (oportunidad.OrdenCompra?.MontoOCAM != null && oportunidad.OrdenCompra.MontoOCAM > 0)
            {
                montoBaseOC = oportunidad.OrdenCompra.MontoOCAM.Value;
            }
            else if (oportunidad.LimiteTotal > 0)
            {
                montoBaseOC = oportunidad.LimiteTotal;
            }

            decimal totalAjusteFlete = CalcularAjusteFleteOportunidad(oportunidad, montoAjusteFleteDto);
            decimal techoTotalConAjustes = montoBaseOC + totalAjusteFlete;

            var pagosPrevios = (await _pagoRepository.ObtenerPorOportunidadIdAsync(oportunidad.Id))
                .Where(p => (!excluirPagoId.HasValue || p.Id != excluirPagoId.Value)
                            && string.Equals(p.Moneda, "PEN", StringComparison.OrdinalIgnoreCase)
                            && CuentaEnAcumulado(p.Estado))
                .ToList();

            // 1. Validación cuando se pide Flete: no debe superar los montos del ajuste de flete
            if (EsConceptoFlete(concepto, conceptoPersonalizado) && totalAjusteFlete > 0)
            {
                var fletePrevio = pagosPrevios
                    .Where(p => EsConceptoFlete(p.Concepto, p.ConceptoPersonalizado))
                    .Sum(p => p.Monto);

                var fleteProyectado = fletePrevio + montoSolicitado;
                if (fleteProyectado > totalAjusteFlete + 0.05m)
                {
                    decimal disponibleFlete = Math.Max(0, totalAjusteFlete - fletePrevio);
                    throw new InvalidOperationException(
                        $"Cuando se solicita pago de Flete, el monto no debe ser mayor al monto del ajuste de flete de la OC. " +
                        $"Tope de Ajuste de Flete: S/ {totalAjusteFlete:N2}, Flete acumulado previo: S/ {fletePrevio:N2}, " +
                        $"Monto solicitado: S/ {montoSolicitado:N2}. Saldo de flete disponible: S/ {disponibleFlete:N2}."
                    );
                }
            }

            // 2. Validación de Techo Total: no puede ser mayor a la Orden de Compra incluyendo los ajustes del flete
            if (techoTotalConAjustes > 0)
            {
                var totalPrevio = pagosPrevios.Sum(p => p.Monto);
                var proyectado = totalPrevio + montoSolicitado;
                if (proyectado > techoTotalConAjustes + 0.05m)
                {
                    decimal disponible = Math.Max(0, techoTotalConAjustes - totalPrevio);
                    throw new InvalidOperationException(
                        $"El monto del pago no puede ser mayor a la Orden de Compra incluyendo los ajustes del flete. " +
                        $"Monto OC: S/ {montoBaseOC:N2} + Ajustes de Flete: S/ {totalAjusteFlete:N2} = Techo Total: S/ {techoTotalConAjustes:N2}. " +
                        $"Pagos acumulados: S/ {totalPrevio:N2}, Nuevo pago: S/ {montoSolicitado:N2}. " +
                        $"Saldo disponible restante: S/ {disponible:N2}."
                    );
                }
            }
        }

        public async Task<PagoResponseDto> RegistrarPagoAsync(RegistrarPagoDto dto, string? usuarioId = null)
        {
            var oportunidad = await _oportunidadRepository.ObtenerPorIdAsync(dto.OportunidadId);
            if (oportunidad == null)
            {
                throw new InvalidOperationException($"No se encontró la oportunidad con ID #{dto.OportunidadId}.");
            }

            await ValidarLimitesFinancierosAsync(
                oportunidad,
                dto.Monto,
                dto.Moneda,
                dto.Concepto,
                dto.ConceptoPersonalizado,
                dto.MontoAjusteFlete);

            var entidadBancaria = !string.IsNullOrWhiteSpace(dto.EntidadCorrespondiente)
                ? dto.EntidadCorrespondiente.Trim()
                : dto.Banco?.Trim();
            var titular = !string.IsNullOrWhiteSpace(dto.TitularCuenta)
                ? dto.TitularCuenta.Trim()
                : dto.Beneficiario?.Trim();
            var estadoInicial = !string.IsNullOrWhiteSpace(dto.Estado)
                ? dto.Estado.Trim()
                : "En Revisión";

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
                MontoAjusteFlete = dto.MontoAjusteFlete ?? CalcularAjusteFleteOportunidad(oportunidad),
                Moneda = dto.Moneda.ToUpperInvariant(),
                FechaPago = DateTime.SpecifyKind(dto.FechaPago, DateTimeKind.Utc),
                FechaVencimientoOC = dto.FechaVencimientoOC.HasValue
                    ? DateTime.SpecifyKind(dto.FechaVencimientoOC.Value, DateTimeKind.Utc)
                    : null,
                MetodoPago = dto.MetodoPago.Trim(),
                Banco = entidadBancaria,
                EntidadCorrespondiente = entidadBancaria,
                NumeroCuentaBancaria = dto.NumeroCuentaBancaria?.Trim(),
                TitularCuenta = titular,
                Beneficiario = titular,
                NumeroOperacion = dto.NumeroOperacion?.Trim(),
                HoraPago = dto.HoraPago?.Trim(),
                Notas = dto.Notas?.Trim(),
                ComprobanteNombreArchivo = dto.ComprobanteNombreArchivo,
                ComprobanteTamanoBytes = dto.ComprobanteTamanoBytes,
                ComprobanteContentType = dto.ComprobanteContentType ?? "image/jpeg",
                ComprobanteDataUrl = dto.ComprobanteDataUrl,
                ComprobanteBackendUrl = dto.ComprobanteBackendUrl,
                ComprobanteBackendImagenId = dto.ComprobanteBackendImagenId,
                RegistradoPor = !string.IsNullOrWhiteSpace(dto.RegistradoPor) ? dto.RegistradoPor : "Ejecutiva de Ventas",
                RegistradoPorEmail = dto.RegistradoPorEmail,
                CreadoPorUsuarioId = usuarioId,
                FechaRegistro = DateTime.UtcNow,
                Estado = estadoInicial
            };

            var creado = await _pagoRepository.CrearAsync(nuevoPago);
            return MapToResponseDto(creado);
        }

        public async Task<PagoResponseDto> ResolverPagoAdminAsync(int id, ResolverPagoAdminDto dto)
        {
            var pago = await _pagoRepository.ObtenerPorIdAsync(id)
                ?? throw new InvalidOperationException($"No se encontró la solicitud de pago con ID #{id}.");

            var estado = (dto.Estado ?? "En Revisión").Trim();

            if (string.Equals(estado, "Pago Rechazado", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(dto.JustificacionCorreccion))
                {
                    throw new InvalidOperationException("Cuando el pago es rechazado, es obligatorio ingresar una justificación de corrección como Administradora.");
                }
                pago.Estado = "Pago Rechazado";
                pago.JustificacionCorreccion = dto.JustificacionCorreccion.Trim();
            }
            else if (string.Equals(estado, "Completo", StringComparison.OrdinalIgnoreCase))
            {
                var numOp = !string.IsNullOrWhiteSpace(dto.NumeroOperacion) ? dto.NumeroOperacion.Trim() : pago.NumeroOperacion;
                var hora = !string.IsNullOrWhiteSpace(dto.HoraPago) ? dto.HoraPago.Trim() : pago.HoraPago;
                var tieneEvidencia = !string.IsNullOrWhiteSpace(dto.ComprobanteDataUrl)
                                     || !string.IsNullOrWhiteSpace(dto.ComprobanteBackendUrl)
                                     || !string.IsNullOrWhiteSpace(pago.ComprobanteDataUrl)
                                     || !string.IsNullOrWhiteSpace(pago.ComprobanteBackendUrl);

                if (string.IsNullOrWhiteSpace(numOp))
                    throw new InvalidOperationException("Debes completar el Número de Operación para marcar el pago como Completo.");
                if (string.IsNullOrWhiteSpace(hora))
                    throw new InvalidOperationException("Debes completar la Hora del pago para marcar el pago como Completo.");
                if (!tieneEvidencia)
                    throw new InvalidOperationException("Debes adjuntar la Evidencia del Pago para marcar el pago como Completo.");

                pago.Estado = "Completo";
                pago.JustificacionCorreccion = null;
            }
            else
            {
                pago.Estado = "En Revisión";
            }

            if (!string.IsNullOrWhiteSpace(dto.NumeroOperacion))
                pago.NumeroOperacion = dto.NumeroOperacion.Trim();

            if (!string.IsNullOrWhiteSpace(dto.HoraPago))
                pago.HoraPago = dto.HoraPago.Trim();

            if (!string.IsNullOrWhiteSpace(dto.ComprobanteDataUrl) || !string.IsNullOrWhiteSpace(dto.ComprobanteBackendUrl))
            {
                pago.ComprobanteNombreArchivo = dto.ComprobanteNombreArchivo ?? pago.ComprobanteNombreArchivo ?? "evidencia_pago.jpg";
                pago.ComprobanteTamanoBytes = dto.ComprobanteTamanoBytes > 0 ? dto.ComprobanteTamanoBytes : pago.ComprobanteTamanoBytes;
                pago.ComprobanteContentType = dto.ComprobanteContentType ?? pago.ComprobanteContentType ?? "image/jpeg";
                pago.ComprobanteDataUrl = dto.ComprobanteDataUrl ?? pago.ComprobanteDataUrl;
                pago.ComprobanteBackendUrl = dto.ComprobanteBackendUrl ?? pago.ComprobanteBackendUrl;
                pago.ComprobanteBackendImagenId = dto.ComprobanteBackendImagenId ?? pago.ComprobanteBackendImagenId;
            }

            pago.ResueltoPorAdmin = string.IsNullOrWhiteSpace(dto.ResueltoPorAdmin) ? "Administradora" : dto.ResueltoPorAdmin.Trim();
            pago.FechaResolucionAdmin = DateTime.UtcNow;

            var actualizado = await _pagoRepository.ActualizarAsync(pago);
            return MapToResponseDto(actualizado);
        }

        public async Task<PagoResponseDto> CorregirPagoAsync(int id, CorregirPagoDto dto)
        {
            var pago = await _pagoRepository.ObtenerPorIdAsync(id)
                ?? throw new InvalidOperationException($"No se encontró la solicitud de pago con ID #{id}.");

            var oportunidad = await _oportunidadRepository.ObtenerPorIdAsync(pago.OportunidadId);
            var nuevoConcepto = !string.IsNullOrWhiteSpace(dto.Concepto) ? dto.Concepto.Trim() : pago.Concepto;
            var nuevoPersonalizado = dto.ConceptoPersonalizado != null ? dto.ConceptoPersonalizado.Trim() : pago.ConceptoPersonalizado;
            var nuevaMoneda = !string.IsNullOrWhiteSpace(dto.Moneda) ? dto.Moneda.Trim().ToUpperInvariant() : pago.Moneda;
            var nuevoMonto = dto.Monto > 0 ? dto.Monto : pago.Monto;

            if (oportunidad != null)
            {
                await ValidarLimitesFinancierosAsync(
                    oportunidad,
                    nuevoMonto,
                    nuevaMoneda,
                    nuevoConcepto,
                    nuevoPersonalizado,
                    dto.MontoAjusteFlete ?? pago.MontoAjusteFlete,
                    excluirPagoId: pago.Id);
            }

            if (dto.FechaVencimientoOC.HasValue)
                pago.FechaVencimientoOC = DateTime.SpecifyKind(dto.FechaVencimientoOC.Value, DateTimeKind.Utc);
            if (!string.IsNullOrWhiteSpace(dto.NumeroCuentaBancaria))
                pago.NumeroCuentaBancaria = dto.NumeroCuentaBancaria.Trim();
            if (!string.IsNullOrWhiteSpace(dto.EntidadCorrespondiente) || !string.IsNullOrWhiteSpace(dto.Banco))
            {
                var ent = (!string.IsNullOrWhiteSpace(dto.EntidadCorrespondiente) ? dto.EntidadCorrespondiente : dto.Banco)!.Trim();
                pago.EntidadCorrespondiente = ent;
                pago.Banco = ent;
            }
            if (!string.IsNullOrWhiteSpace(dto.TitularCuenta) || !string.IsNullOrWhiteSpace(dto.Beneficiario))
            {
                var tit = (!string.IsNullOrWhiteSpace(dto.TitularCuenta) ? dto.TitularCuenta : dto.Beneficiario)!.Trim();
                pago.TitularCuenta = tit;
                pago.Beneficiario = tit;
            }

            pago.Concepto = nuevoConcepto;
            pago.ConceptoPersonalizado = nuevoPersonalizado;
            pago.Monto = nuevoMonto;
            if (dto.MontoAjusteFlete.HasValue)
                pago.MontoAjusteFlete = dto.MontoAjusteFlete.Value;
            pago.Moneda = nuevaMoneda;
            if (dto.FechaPago.HasValue)
                pago.FechaPago = DateTime.SpecifyKind(dto.FechaPago.Value, DateTimeKind.Utc);
            if (!string.IsNullOrWhiteSpace(dto.MetodoPago))
                pago.MetodoPago = dto.MetodoPago.Trim();
            if (dto.Notas != null)
                pago.Notas = dto.Notas.Trim();

            pago.Estado = "En Revisión";

            var actualizado = await _pagoRepository.ActualizarAsync(pago);
            return MapToResponseDto(actualizado);
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
            decimal totalAjusteFlete = 0;
            string razonSocial = primerPago?.EmpresaRazonSocial ?? primerPago?.EntidadConvocante ?? "";
            string req = primerPago?.NumeroRequerimiento ?? "";

            if (primerPago?.OportunidadId > 0)
            {
                var op = await _oportunidadRepository.ObtenerPorIdAsync(primerPago.OportunidadId);
                if (op != null)
                {
                    montoTotalOC = op.OrdenCompra?.MontoOCAM ?? op.LimiteTotal;
                    totalAjusteFlete = CalcularAjusteFleteOportunidad(op, primerPago.MontoAjusteFlete);
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

            var techoConAjustes = montoTotalOC + totalAjusteFlete;
            var totalPagado = listaDto
                .Where(p => p.Moneda == "PEN" && CuentaEnAcumulado(p.Estado))
                .Sum(p => p.Monto);

            return new LiquidacionOCResponseDto
            {
                NumeroOC = numeroOC,
                NumeroRequerimiento = req,
                EmpresaRazonSocial = razonSocial,
                MontoTotalOC = montoTotalOC,
                TotalAjusteFlete = totalAjusteFlete,
                MontoTechoConAjustes = techoConAjustes,
                TotalPagado = totalPagado,
                SaldoPendiente = Math.Max(0, techoConAjustes - totalPagado),
                TotalPagos = listaDto.Count,
                Moneda = "PEN",
                Pagos = listaDto
            };
        }

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
                MontoAjusteFlete = p.MontoAjusteFlete,
                Moneda = p.Moneda,
                FechaPago = p.FechaPago.ToString("yyyy-MM-dd"),
                FechaVencimientoOC = p.FechaVencimientoOC?.ToString("yyyy-MM-dd"),
                MetodoPago = p.MetodoPago,
                Banco = p.Banco ?? p.EntidadCorrespondiente,
                EntidadCorrespondiente = p.EntidadCorrespondiente ?? p.Banco,
                NumeroCuentaBancaria = p.NumeroCuentaBancaria,
                TitularCuenta = p.TitularCuenta ?? p.Beneficiario,
                Beneficiario = p.Beneficiario ?? p.TitularCuenta,
                NumeroOperacion = p.NumeroOperacion,
                HoraPago = p.HoraPago,
                Notas = p.Notas,
                Comprobante = new ComprobanteResponseDto
                {
                    NombreArchivo = p.ComprobanteNombreArchivo ?? "Pendiente de adjuntar por Administración",
                    TamanoBytes = p.ComprobanteTamanoBytes,
                    TamanoFormateado = tamanoFormateado,
                    ContentType = p.ComprobanteContentType ?? "image/jpeg",
                    DataUrl = p.ComprobanteDataUrl ?? "",
                    BackendImagenId = p.ComprobanteBackendImagenId,
                    BackendUrl = p.ComprobanteBackendUrl,
                    FechaSubida = p.FechaResolucionAdmin ?? p.FechaRegistro
                },
                RegistradoPor = p.RegistradoPor,
                RegistradoPorEmail = p.RegistradoPorEmail,
                FechaRegistro = p.FechaRegistro,
                Estado = p.Estado,
                JustificacionCorreccion = p.JustificacionCorreccion,
                ResueltoPorAdmin = p.ResueltoPorAdmin,
                FechaResolucionAdmin = p.FechaResolucionAdmin
            };
        }
    }
}

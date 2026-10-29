using System.IO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Domain.DTOs.Oportunidad;
using Domain.Interfaces.Repositories;
using Domain.Interfaces.Services;
using Domain.Models;

namespace Aplicacion.Services
{
    public class OportunidadService : IOportunidadService
    {
        private readonly IOportunidadRepository _oportunidadRepository;
        private readonly IAcuerdoMarcoRepository _acuerdoMarcoRepository;
        private readonly IMarcaRepository _marcaRepository;
        private readonly IEmpresaRepository _empresaRepository;

        public OportunidadService(
            IOportunidadRepository oportunidadRepository,
            IAcuerdoMarcoRepository acuerdoMarcoRepository,
            IMarcaRepository marcaRepository,
            IEmpresaRepository empresaRepository)
        {
            _oportunidadRepository = oportunidadRepository;
            _acuerdoMarcoRepository = acuerdoMarcoRepository;
            _marcaRepository = marcaRepository;
            _empresaRepository = empresaRepository;
        }

        public async Task<IEnumerable<OportunidadResponseDto>> ObtenerTodasAsync()
        {
            var list = await _oportunidadRepository.ObtenerTodasAsync();
            return list.Select(MapToResponseDto);
        }

        public async Task<OportunidadResponseDto?> ObtenerPorIdAsync(int id)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            return op == null ? null : MapToResponseDto(op);
        }

        /// <summary>
        /// REGISTRO RÁPIDO: Permite a las ejecutivas registrar la oportunidad a máxima velocidad.
        /// La Empresa / Entidad es opcional para no retrasar el registro en Perú Compras.
        /// </summary>
        public async Task<OportunidadResponseDto> CrearAsync(CrearOportunidadDto dto, string? usuarioId = null)
        {
            // Validar Acuerdo Marco (opcional para registro rápido)
            if (dto.AcuerdoMarcoId.HasValue && dto.AcuerdoMarcoId.Value > 0)
            {
                var acuerdo = await _acuerdoMarcoRepository.ObtenerPorIdAsync(dto.AcuerdoMarcoId.Value);
                if (acuerdo == null)
                    throw new InvalidOperationException($"El Acuerdo Marco con Id '{dto.AcuerdoMarcoId}' no existe.");
            }

            // Validar Empresa si fue enviada (opcional)
            if (dto.EmpresaId.HasValue && dto.EmpresaId.Value > 0)
            {
                var empresa = await _empresaRepository.ObtenerPorIdAsync(dto.EmpresaId.Value);
                if (empresa == null)
                    throw new InvalidOperationException($"La Empresa con Id '{dto.EmpresaId}' no existe.");
            }

            var reqUpper = dto.NumeroRequerimiento.Trim().ToUpper();

            // ── REGLA DE PRIORIDAD DEL PODIO (VENTANA DE 5 MINUTOS) ──
            // Si el requerimiento ya fue registrado (por cualquier ejecutiva) hace menos
            // de 5 minutos, se BLOQUEA el nuevo registro: el primero conserva la prioridad.
            var primerRegistro = await _oportunidadRepository.ObtenerPrimerRegistroAsync(reqUpper);
            if (primerRegistro.HasValue)
            {
                var antiguedad = DateTime.UtcNow - primerRegistro.Value;
                if (antiguedad < TimeSpan.FromMinutes(5))
                {
                    var restante = TimeSpan.FromMinutes(5) - antiguedad;
                    var segundos = Math.Ceiling(restante.TotalSeconds);
                    throw new InvalidOperationException(
                        $"El requerimiento '{reqUpper}' ya fue registrado por otra ejecutiva hace menos de 5 minutos y conserva la prioridad del podio. Puedes registrar este requerimiento nuevamente en {segundos} segundos.");
                }
            }

            // Validar unicidad removido: se permite registrar múltiples oportunidades por requerimiento

            // ── REGLA DE NEGOCIO: OPORTUNIDAD INMUTABLE SI ESTÁ COMPLETA ──
            var estaCompleta = (dto.AcuerdoMarcoId.HasValue && dto.AcuerdoMarcoId.Value > 0)
                               && dto.FechaVencimientoLicitacion.HasValue
                               && ((dto.EmpresaId.HasValue && dto.EmpresaId.Value > 0) || !string.IsNullOrWhiteSpace(dto.EntidadConvocante))
                               && dto.MarcaIds != null && dto.MarcaIds.Any()
                               && dto.Productos != null && dto.Productos.Any();

            var oportunidad = new Oportunidad
            {
                NumeroRequerimiento = reqUpper,
                AcuerdoMarcoId = (dto.AcuerdoMarcoId.HasValue && dto.AcuerdoMarcoId.Value > 0) ? dto.AcuerdoMarcoId.Value : 1,
                FechaVencimientoLicitacion = dto.FechaVencimientoLicitacion.HasValue
                    ? (dto.FechaVencimientoLicitacion.Value.Kind == DateTimeKind.Utc ? dto.FechaVencimientoLicitacion.Value : DateTime.SpecifyKind(dto.FechaVencimientoLicitacion.Value, DateTimeKind.Utc))
                    : null,
                EmpresaId = dto.EmpresaId > 0 ? dto.EmpresaId : null,
                EntidadConvocante = dto.EntidadConvocante?.Trim(),
                CreadoPorUsuarioId = usuarioId,
                FechaRegistro = DateTime.UtcNow,
                // Al registrarse la oportunidad entra al pipeline en estado En Licitación.
                Estado = "En Licitación",
                EstaBloqueada = estaCompleta
            };

            // 1. Asociar Marcas
            foreach (var marcaId in dto.MarcaIds.Distinct())
            {
                oportunidad.OportunidadMarcas.Add(new OportunidadMarca
                {
                    MarcaId = marcaId
                });
            }

            // 2. Asociar Productos con cálculo de subtotales
            foreach (var p in dto.Productos)
            {
                oportunidad.Productos.Add(MapearProducto(p));
            }

            // 3. Calcular Límite Total de la Oportunidad
            oportunidad.LimiteTotal = oportunidad.Productos.Sum(p => p.LimiteSubtotal);

            await _oportunidadRepository.CrearAsync(oportunidad);

            return (await ObtenerPorIdAsync(oportunidad.Id))!;
        }

        /// <summary>
        /// REGLA DE NEGOCIO ESTRICTA PARA ACTUALIZACIÓN:
        /// 1. Datos de la Convocatoria Perú Compras (Requerimiento, Acuerdo Marco, Fecha Vencimiento) -> NO SE EDITAN.
        /// 2. Empresa / Entidad Solicitante -> SE EDITA (se puede asociar o completar después del registro rápido).
        /// 3. Marcas y Productos/Límites del Requerimiento -> SE EDITAN.
        /// </summary>
        public async Task<OportunidadResponseDto> ActualizarAsync(int id, ActualizarOportunidadDto dto, string? usuarioId = null, bool esAdmin = false)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            // ── REGLA DE INMUTABILIDAD: Solo el Administrador puede editar una oportunidad bloqueada ──
            if (op.EstaBloqueada && !esAdmin)
                throw new InvalidOperationException("La oportunidad ya fue confirmada y es inmutable. No se puede editar excepto por un Administrador.");

            // ── PROTECCIÓN: LOS DATOS DE CONVOCATORIA PERÚ COMPRAS NO SE MODIFICAN ──
            // op.NumeroRequerimiento       -> INALTERADO
            // op.AcuerdoMarcoId           -> INALTERADO
            // op.FechaVencimientoLicitacion -> INALTERADO

            // ── EDICIÓN 0: ACTUALIZAR ACUERDO MARCO ──
            if (dto.AcuerdoMarcoId.HasValue && dto.AcuerdoMarcoId.Value > 0)
            {
                var acuerdo = await _acuerdoMarcoRepository.ObtenerPorIdAsync(dto.AcuerdoMarcoId.Value);
                if (acuerdo == null)
                    throw new InvalidOperationException($"El Acuerdo Marco con Id '{dto.AcuerdoMarcoId}' no existe.");
                op.AcuerdoMarcoId = dto.AcuerdoMarcoId.Value;
            }

            // ── EDICIÓN 1: ACTUALIZAR EMPRESA / CLIENTE SOLICITANTE ──
            if (dto.EmpresaId.HasValue && dto.EmpresaId.Value > 0)
            {
                var empresa = await _empresaRepository.ObtenerPorIdAsync(dto.EmpresaId.Value);
                if (empresa == null)
                    throw new InvalidOperationException($"La Empresa con Id '{dto.EmpresaId}' no existe.");
                op.EmpresaId = dto.EmpresaId.Value;
            }
            else if (dto.EmpresaId == null)
            {
                op.EmpresaId = null;
            }

            op.EntidadConvocante = dto.EntidadConvocante?.Trim();

            // ── EDICIÓN 2: ACTUALIZAR MARCAS PARTICIPANTES ──
            op.OportunidadMarcas.Clear();
            foreach (var marcaId in dto.MarcaIds.Distinct())
            {
                op.OportunidadMarcas.Add(new OportunidadMarca
                {
                    OportunidadId = op.Id,
                    MarcaId = marcaId
                });
            }

            // ── EDICIÓN 3: ACTUALIZAR PRODUCTOS Y LÍMITES (Preservando Flete Aprobado) ──
            var productosActualizados = new List<OportunidadProducto>();
            foreach (var p in dto.Productos)
            {
                var prodExistente = p.Id.HasValue && p.Id.Value > 0
                    ? op.Productos.FirstOrDefault(x => x.Id == p.Id.Value)
                    : null;

                if (prodExistente != null)
                {
                    prodExistente.NumeroParte = p.NumeroParte.Trim();
                    prodExistente.Descripcion = p.Descripcion?.Trim();
                    prodExistente.Cantidad = p.Cantidad;
                    prodExistente.LimiteUnitario = p.LimiteUnitario;
                    prodExistente.LimiteSubtotal = p.Cantidad * p.LimiteUnitario;
                    prodExistente.FichaProducto = string.IsNullOrWhiteSpace(p.FichaProducto) ? null : p.FichaProducto.Trim();
                    prodExistente.MarcaProducto = string.IsNullOrWhiteSpace(p.MarcaProducto) ? null : p.MarcaProducto.Trim();
                    prodExistente.Moneda = string.IsNullOrWhiteSpace(p.Moneda) ? "PEN" : p.Moneda.Trim().ToUpperInvariant();
                    prodExistente.PrecioUnitarioBase = p.PrecioUnitarioBase;
                    prodExistente.PrecioUnitarioOfertado = p.PrecioUnitarioOfertado;
                    prodExistente.CondicionesAdicionales = string.IsNullOrWhiteSpace(p.CondicionesAdicionales) ? null : p.CondicionesAdicionales.Trim();
                    prodExistente.FichaTecnica = string.IsNullOrWhiteSpace(p.FichaTecnica) ? null : p.FichaTecnica.Trim();

                    if (p.AjusteFleteSolicitadoPorcentaje.HasValue && p.AjusteFleteSolicitadoPorcentaje.Value > 0 && prodExistente.AjusteFleteEstado != "Aprobado")
                    {
                        prodExistente.AjusteFleteSolicitadoPorcentaje = p.AjusteFleteSolicitadoPorcentaje.Value;
                        prodExistente.AjusteFleteMotivo = p.AjusteFleteMotivo?.Trim();
                        prodExistente.AjusteFleteEstado = "Pendiente";
                    }

                    prodExistente.Proveedores.Clear();
                    foreach (var pv in p.Proveedores.Where(x => !string.IsNullOrWhiteSpace(x.NombreProveedor)))
                    {
                        prodExistente.Proveedores.Add(new ItemProveedor
                        {
                            OportunidadProductoId = prodExistente.Id,
                            NombreProveedor = pv.NombreProveedor.Trim(),
                            Cantidad = pv.Cantidad,
                            CostoUnitario = pv.CostoUnitario,
                            CostoEnvio = pv.CostoEnvio
                        });
                    }

                    productosActualizados.Add(prodExistente);
                }
                else
                {
                    productosActualizados.Add(MapearProducto(p, op.Id));
                }
            }

            var idsConservados = productosActualizados.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();
            var eliminados = op.Productos.Where(x => !idsConservados.Contains(x.Id)).ToList();
            foreach (var rem in eliminados)
            {
                op.Productos.Remove(rem);
            }

            foreach (var prodNuevo in productosActualizados.Where(x => x.Id == 0))
            {
                op.Productos.Add(prodNuevo);
            }

            // Recalcular Límite Total de la Oportunidad
            op.LimiteTotal = op.Productos.Sum(p => p.LimiteSubtotal);

            // Si ahora cuenta con todos los datos clave, pasa a ser inmutable
            var ahoraCompleta = (op.AcuerdoMarcoId > 0)
                                && op.FechaVencimientoLicitacion.HasValue
                                && (op.EmpresaId.HasValue || !string.IsNullOrWhiteSpace(op.EntidadConvocante))
                                && op.OportunidadMarcas.Any()
                                && op.Productos.Any();
            if (ahoraCompleta)
            {
                op.EstaBloqueada = true;
            }

            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> ActualizarMarcasAsync(int id, List<int> marcaIds)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            op.OportunidadMarcas.Clear();
            foreach (var marcaId in marcaIds.Distinct())
            {
                op.OportunidadMarcas.Add(new OportunidadMarca
                {
                    OportunidadId = op.Id,
                    MarcaId = marcaId
                });
            }

            op.FechaActualizacion = DateTime.UtcNow;
            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> ActualizarProductosAsync(int id, List<ProductoItemDto> productos)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            op.Productos.Clear();
            foreach (var p in productos)
            {
                op.Productos.Add(MapearProducto(p, op.Id));
            }

            op.LimiteTotal = op.Productos.Sum(p => p.LimiteSubtotal);
            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> AgregarMarcaAsync(int id, int marcaId)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            if (!op.OportunidadMarcas.Any(om => om.MarcaId == marcaId))
            {
                op.OportunidadMarcas.Add(new OportunidadMarca
                {
                    OportunidadId = op.Id,
                    MarcaId = marcaId
                });
                op.FechaActualizacion = DateTime.UtcNow;
                await _oportunidadRepository.ActualizarAsync(op);
            }

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> EliminarMarcaAsync(int id, int marcaId)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            var item = op.OportunidadMarcas.FirstOrDefault(om => om.MarcaId == marcaId);
            if (item != null)
            {
                op.OportunidadMarcas.Remove(item);
                op.FechaActualizacion = DateTime.UtcNow;
                await _oportunidadRepository.ActualizarAsync(op);
            }

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> AgregarProductoAsync(int id, ProductoItemDto producto)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            op.Productos.Add(MapearProducto(producto, op.Id));

            op.LimiteTotal = op.Productos.Sum(p => p.LimiteSubtotal);
            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> EliminarProductoAsync(int id, int productoId)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            var item = op.Productos.FirstOrDefault(p => p.Id == productoId);
            if (item != null)
            {
                op.Productos.Remove(item);
                op.LimiteTotal = op.Productos.Sum(p => p.LimiteSubtotal);
                op.FechaActualizacion = DateTime.UtcNow;
                await _oportunidadRepository.ActualizarAsync(op);
            }

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        /// <summary>
        /// Mapea un ítem del DTO a la entidad, calculando el subtotal y normalizando
        /// los datos opcionales de la proforma Perú Compras.
        /// </summary>
        private static OportunidadProducto MapearProducto(ProductoItemDto p, int oportunidadId = 0)
        {
            var tieneSolicitudFlete = p.AjusteFleteSolicitadoPorcentaje.HasValue && p.AjusteFleteSolicitadoPorcentaje.Value > 0;
            return new OportunidadProducto
            {
                OportunidadId = oportunidadId,
                NumeroParte = p.NumeroParte.Trim(),
                Descripcion = p.Descripcion?.Trim(),
                Cantidad = p.Cantidad,
                LimiteUnitario = p.LimiteUnitario,
                LimiteSubtotal = p.Cantidad * p.LimiteUnitario,
                FichaProducto = string.IsNullOrWhiteSpace(p.FichaProducto) ? null : p.FichaProducto.Trim(),
                MarcaProducto = string.IsNullOrWhiteSpace(p.MarcaProducto) ? null : p.MarcaProducto.Trim(),
                Moneda = string.IsNullOrWhiteSpace(p.Moneda) ? "PEN" : p.Moneda.Trim().ToUpperInvariant(),
                PrecioUnitarioBase = p.PrecioUnitarioBase,
                PrecioUnitarioOfertado = p.PrecioUnitarioOfertado,
                CondicionesAdicionales = string.IsNullOrWhiteSpace(p.CondicionesAdicionales) ? null : p.CondicionesAdicionales.Trim(),
                FichaTecnica = string.IsNullOrWhiteSpace(p.FichaTecnica) ? null : p.FichaTecnica.Trim(),
                AjusteFletePorcentaje = null,
                AjusteFleteSolicitadoPorcentaje = tieneSolicitudFlete ? p.AjusteFleteSolicitadoPorcentaje : null,
                AjusteFleteMotivo = tieneSolicitudFlete ? p.AjusteFleteMotivo?.Trim() : null,
                AjusteFleteEstado = tieneSolicitudFlete ? "Pendiente" : "Sin Ajuste",
                AjusteFleteComentarioAdmin = null,
                Proveedores = p.Proveedores
                    .Where(pv => !string.IsNullOrWhiteSpace(pv.NombreProveedor))
                    .Select(pv => new ItemProveedor
                    {
                        NombreProveedor = pv.NombreProveedor.Trim(),
                        Cantidad = pv.Cantidad,
                        CostoUnitario = pv.CostoUnitario,
                        CostoEnvio = pv.CostoEnvio
                    })
                    .ToList(),
            };
        }

        public async Task<OportunidadResponseDto> CambiarEstadoAsync(int id, CambiarEstadoDto dto, string usuarioId, bool esAdmin = false)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id)
                ?? throw new KeyNotFoundException($"Oportunidad {id} no encontrada.");

            if (!esAdmin && op.CreadoPorUsuarioId != usuarioId)
                throw new UnauthorizedAccessException("Solo la ejecutiva que registró la oportunidad o un administrador pueden resolver o cambiar su estado.");

            var estadoReq = dto.Estado.Trim();
            if (estadoReq.Equals("Aceptada por Peru Compras", StringComparison.OrdinalIgnoreCase)) estadoReq = "Aceptada por Perú Compras";
            if (estadoReq.Equals("En Licitacion", StringComparison.OrdinalIgnoreCase)) estadoReq = "En Licitación";
            if (estadoReq.Equals("Cotizacion", StringComparison.OrdinalIgnoreCase)) estadoReq = "Cotización";
            if (estadoReq.Equals("Aceptada", StringComparison.OrdinalIgnoreCase)) estadoReq = "Aceptada por el Administrador";

            if (!esAdmin)
            {
                var transicionesPermitidas = new Dictionary<string, string[]>
                {
                    ["En Licitación"] = new[] { "Cotizada", "Cotización", "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada" },
                    ["En Licitacion"] = new[] { "Cotizada", "Cotización", "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada" },
                    ["En Competencia"] = new[] { "Cotizada", "Cotización", "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada" },
                    ["Asignación de Oportunidad"] = new[] { "Cotizada", "Cotización", "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Por Vencer"] = new[] { "Cotizada", "Cotización", "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Cotizada"] = new[] { "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Cotización"] = new[] { "Adjudicada", "Aceptada", "Aceptada por el Administrador", "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Adjudicada"] = new[] { "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Aceptada"] = new[] { "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Aceptada por el Administrador"] = new[] { "Aceptada por Perú Compras", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Aceptada por Perú Compras"] = new[] { "Cotización", "OC_RECIBIDA", "Aceptada Desestimada", "Desestimada", "En Licitación" },
                    ["Aceptada Desestimada"] = new[] { "En Licitación" },
                    ["Desestimada"] = new[] { "En Licitación" },
                };

                if (!transicionesPermitidas.TryGetValue(op.Estado, out var permitidos)
                    || !permitidos.Contains(estadoReq))
                {
                    throw new InvalidOperationException(
                        $"No se puede cambiar de \"{op.Estado}\" a \"{estadoReq}\".");
                }
            }

            // ── MOTIVO OBLIGATORIO AL DESESTIMAR ──
            if (estadoReq == "Desestimada" || estadoReq == "Aceptada Desestimada")
            {
                if (string.IsNullOrWhiteSpace(dto.Motivo))
                {
                    throw new InvalidOperationException(
                        "Debes indicar el motivo por el cual se desestima el requerimiento.");
                }
            }

            // ── REGLA DE NEGOCIO ESTRICTA: BUENA PRO ÚNICA POR REQUERIMIENTO ──
            // Si se intenta adjudicar ("Adjudicada", "Aceptada por el Administrador", "Aceptada por Perú Compras")
            // y ya existe otra postulación para el mismo requerimiento con Buena Pro asignada, se rechaza la solicitud.
            if (estadoReq == "Adjudicada" || estadoReq == "Aceptada" || estadoReq == "Aceptada por el Administrador" || estadoReq == "Aceptada por Perú Compras")
            {
                var yaTieneBuenaPro = await _oportunidadRepository.ExisteBuenaProAsync(op.NumeroRequerimiento, op.Id);
                if (yaTieneBuenaPro)
                {
                    throw new InvalidOperationException(
                        $"El requerimiento \x27{op.NumeroRequerimiento}\x27 ya cuenta con una postulación adjudicada con Buena Pro. No se puede adjudicar más de una Buena Pro por requerimiento.");
                }
            }

            // Si el Administrador reabre o regresa la oportunidad a "En Licitación", se desbloquea
            if (esAdmin && (estadoReq.Equals("En Licitación", StringComparison.OrdinalIgnoreCase) || estadoReq.Equals("En Licitacion", StringComparison.OrdinalIgnoreCase)))
            {
                op.EstaBloqueada = false;
            }

            op.Estado = estadoReq;
            op.MotivoDesestimacion = (estadoReq == "Desestimada" || estadoReq == "Aceptada Desestimada") ? dto.Motivo?.Trim() : null;
            op.FechaActualizacion = DateTime.UtcNow;
            await _oportunidadRepository.ActualizarAsync(op);

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        // ── AJUSTE DE FLETE POR PRODUCTO (APROBACIÓN DE ADMINISTRADOR) ──
        public async Task<OportunidadResponseDto> SolicitarAjusteFleteAsync(int oportunidadId, int productoId, SolicitarAjusteFleteDto dto, string usuarioId)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(oportunidadId)
                ?? throw new KeyNotFoundException($"Oportunidad {oportunidadId} no encontrada.");

            var prod = op.Productos.FirstOrDefault(p => p.Id == productoId)
                ?? throw new KeyNotFoundException($"Producto {productoId} no encontrado en la oportunidad {oportunidadId}.");

            if (dto.Porcentaje <= 0 || dto.Porcentaje > 100)
                throw new InvalidOperationException("El porcentaje de flete solicitado debe estar entre 0.01% y 100%.");

            if (string.IsNullOrWhiteSpace(dto.Motivo))
                throw new InvalidOperationException("El motivo de la solicitud de flete es obligatorio.");

            prod.AjusteFleteSolicitadoPorcentaje = dto.Porcentaje;
            prod.AjusteFleteMotivo = dto.Motivo.Trim();
            prod.AjusteFleteEstado = "Pendiente";
            prod.AjusteFleteComentarioAdmin = null;

            op.FechaActualizacion = DateTime.UtcNow;
            await _oportunidadRepository.ActualizarAsync(op);

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<OportunidadResponseDto> ResolverAjusteFleteAsync(int oportunidadId, int productoId, ResolverAjusteFleteDto dto, string usuarioId, bool esAdmin)
        {
            if (!esAdmin)
                throw new UnauthorizedAccessException("Solo el Administrador puede aprobar o rechazar el ajuste de flete.");

            var op = await _oportunidadRepository.ObtenerPorIdAsync(oportunidadId)
                ?? throw new KeyNotFoundException($"Oportunidad {oportunidadId} no encontrada.");

            var prod = op.Productos.FirstOrDefault(p => p.Id == productoId)
                ?? throw new KeyNotFoundException($"Producto {productoId} no encontrado en la oportunidad {oportunidadId}.");

            if (prod.AjusteFleteEstado != "Pendiente" && prod.AjusteFleteSolicitadoPorcentaje == null)
                throw new InvalidOperationException("Este producto no tiene una solicitud de ajuste de flete pendiente.");

            if (dto.Aprobado)
            {
                prod.AjusteFletePorcentaje = prod.AjusteFleteSolicitadoPorcentaje ?? 0;
                prod.AjusteFleteEstado = "Aprobado";
                prod.AjusteFleteComentarioAdmin = string.IsNullOrWhiteSpace(dto.Comentario) ? "Aprobado por el Administrador" : dto.Comentario.Trim();
            }
            else
            {
                if (string.IsNullOrWhiteSpace(dto.Comentario))
                    throw new InvalidOperationException("Debe ingresar un comentario obligatorio al rechazar la solicitud de flete.");

                prod.AjusteFleteEstado = "Rechazado";
                prod.AjusteFleteComentarioAdmin = dto.Comentario.Trim();
            }

            op.FechaActualizacion = DateTime.UtcNow;
            await _oportunidadRepository.ActualizarAsync(op);

            return (await ObtenerPorIdAsync(op.Id))!;
        }

        public async Task<bool> EliminarAsync(int id)
        {
            return await _oportunidadRepository.EliminarAsync(id);
        }

        // ══════════════════════════════════════════════════════════════════════
        // BLOQUE 2: ÓRDENES DE COMPRA Y OPERACIONES (OC & Logística)
        // ══════════════════════════════════════════════════════════════════════

        private const decimal MARGEN_BASE_ESTIMADO_CONVERT = 1m; // reservado para cálculo de margen (soles) si aplica

        private static async Task<Oportunidad> ValidarOportunidadYPropietarioAsync(
            int id, string usuarioId, IOportunidadRepository repo)
        {
            var op = await repo.ObtenerPorIdAsync(id)
                ?? throw new KeyNotFoundException($"Oportunidad {id} no encontrada.");

            if (op.CreadoPorUsuarioId != usuarioId)
                throw new UnauthorizedAccessException("Solo la ejecutiva que registró la oportunidad puede gestionar su Orden de Compra.");

            return op;
        }

        /// <summary>
        /// BLOQUE 2 – Hito 1: Registra la OC emitida por la entidad pública tras la adjudicación.
        /// Transición: Adjudicada → OC_RECIBIDA.
        /// Solo una OC por oportunidad.
        /// </summary>
        public async Task<OportunidadResponseDto> RegistrarOrdenCompraAsync(int id, RegistrarOrdenCompraDto dto, string usuarioId)
        {
            var op = await ValidarOportunidadYPropietarioAsync(id, usuarioId, _oportunidadRepository);

            var estadoNorm = (op.Estado ?? string.Empty).Trim();
            var esAceptadaPeruCompras = estadoNorm.Equals("Aceptada por Perú Compras", StringComparison.OrdinalIgnoreCase)
                                     || estadoNorm.Equals("Aceptada por Peru Compras", StringComparison.OrdinalIgnoreCase)
                                     || estadoNorm.Equals("Adjudicada", StringComparison.OrdinalIgnoreCase);

            if (!esAceptadaPeruCompras)
            {
                if (estadoNorm.Equals("Aceptada por el Administrador", StringComparison.OrdinalIgnoreCase) || estadoNorm.Equals("Aceptada", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        $"La Orden de Compra Oficial (OCAM) solo puede registrarse cuando la oportunidad haya sido aceptada por Perú Compras con el documento oficial correspondiente. Estado actual: \"{op.Estado}\". Primero debe adjuntarse el documento oficial de Perú Compras.");
                }

                throw new InvalidOperationException(
                    $"El registro de Orden de Compra Oficial (OCAM) solo se puede generar cuando la oportunidad sea \"Aceptada por Perú Compras\". Estado actual: \"{op.Estado}\".");
            }

            if (op.OrdenCompra != null)
                throw new InvalidOperationException("Esta oportunidad ya tiene una Orden de Compra registrada.");

            if (!string.IsNullOrWhiteSpace(dto.NumeroOC) &&
                op.OrdenCompra?.NumeroOC?.Equals(dto.NumeroOC.Trim(), StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("Ya existe una OC registrada con ese número.");
            }

            op.OrdenCompra = new OrdenCompra
            {
                OportunidadId = op.Id,
                NumeroOC = dto.NumeroOC.Trim(),
                FechaEmisionOC = dto.FechaEmisionOC.HasValue
                    ? (dto.FechaEmisionOC.Value.Kind == DateTimeKind.Utc ? dto.FechaEmisionOC.Value : DateTime.SpecifyKind(dto.FechaEmisionOC.Value, DateTimeKind.Utc))
                    : null,
                EstadoOC = "OC_RECIBIDA",
                // ── Datos de la Buena Pro / Adjudicación (Perú Compras) ──
                NroOCAM = string.IsNullOrWhiteSpace(dto.NroOCAM) ? null : dto.NroOCAM.Trim(),
                NroExpediente = string.IsNullOrWhiteSpace(dto.NroExpediente) ? null : dto.NroExpediente.Trim(),
                Unidad = string.IsNullOrWhiteSpace(dto.Unidad) ? null : dto.Unidad.Trim(),
                CodigoCIAF = string.IsNullOrWhiteSpace(dto.CodigoCIAF) ? null : dto.CodigoCIAF.Trim(),
                MontoOCAM = dto.MontoOCAM
            };

            op.Estado = "OC_RECIBIDA";
            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        /// <summary>
        /// BLOQUE 2 – Hito 2: Acepta o rechaza la OC (Día 7.º hábil).
        /// Transición: OC_RECIBIDA → OC_ACEPTADA | OC_RECHAZADA.
        /// El motivo es obligatorio al rechazar.
        /// SOLO el rol Admin/Master (quien resuelve las licitaciones) decide la OC;
        /// la ejecutiva propietaria solo registra los datos de la buena pro.
        /// </summary>
        public async Task<OportunidadResponseDto> CambiarEstadoOCAsync(int id, CambiarEstadoOCDto dto, string usuarioId, bool esAdmin = false)
        {
            if (!esAdmin)
                throw new UnauthorizedAccessException("Solo el rol Admin/Master puede aceptar o rechazar la Orden de Compra.");

            var op = await _oportunidadRepository.ObtenerPorIdAsync(id)
                ?? throw new KeyNotFoundException($"Oportunidad {id} no encontrada.");

            if (op.OrdenCompra == null)
                throw new InvalidOperationException("Primero debe registrar la Orden de Compra.");

            if (op.OrdenCompra.EstadoOC != "OC_RECIBIDA")
                throw new InvalidOperationException(
                    $"Solo se puede aceptar o rechazar una OC en estado OC_RECIBIDA. Estado actual: \"{op.OrdenCompra.EstadoOC}\".");

            if (dto.EstadoOC == "OC_RECHAZADA" && string.IsNullOrWhiteSpace(dto.MotivoRechazo))
                throw new InvalidOperationException("Debe indicar el motivo al rechazar la Orden de Compra.");

            op.OrdenCompra.EstadoOC = dto.EstadoOC;
            op.OrdenCompra.MotivoRechazo = dto.EstadoOC == "OC_RECHAZADA" ? dto.MotivoRechazo?.Trim() : null;
            op.OrdenCompra.FechaDecisionOC = DateTime.UtcNow;
            op.OrdenCompra.FechaActualizacion = DateTime.UtcNow;

            op.Estado = dto.EstadoOC; // OC_ACEPTADA | OC_RECHAZADA
            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        /// <summary>
        /// BLOQUE 2 – Hito 3: Renegociación de rentabilidad y fletes (Día 8.º hábil).
        /// Solo sobre OC aceptada. Margen adicional = CostoInicial - CostoRenegociado.
        /// </summary>
        public async Task<OportunidadResponseDto> RenegociarCostoAsync(int id, RenegociarCostoDto dto, string usuarioId)
        {
            var op = await ValidarOportunidadYPropietarioAsync(id, usuarioId, _oportunidadRepository);

            if (op.OrdenCompra == null)
                throw new InvalidOperationException("Primero debe registrar la Orden de Compra.");

            if (op.OrdenCompra.EstadoOC != "OC_ACEPTADA")
                throw new InvalidOperationException(
                    "La renegociación solo es válida sobre una OC aceptada (OC_ACEPTADA).");

            if (dto.CostoRenegociado >= dto.CostoInicial)
                throw new InvalidOperationException(
                    "El costo renegociado debe ser menor al costo inicial para generar margen adicional.");

            op.OrdenCompra.CostoInicial = dto.CostoInicial;
            op.OrdenCompra.CostoRenegociado = dto.CostoRenegociado;
            op.OrdenCompra.MargenAdicional = dto.CostoInicial - dto.CostoRenegociado;
            op.OrdenCompra.FechaRenegociacion = DateTime.UtcNow;
            op.OrdenCompra.FechaActualizacion = DateTime.UtcNow;
            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        /// <summary>
        /// BLOQUE 2 – Hito 4: Despacho y entrega según plazos de la OC.
        /// Transición: OC_ACEPTADA → ENTREGADA.
        /// </summary>
        public async Task<OportunidadResponseDto> RegistrarEntregaAsync(int id, RegistrarEntregaDto dto, string usuarioId)
        {
            var op = await ValidarOportunidadYPropietarioAsync(id, usuarioId, _oportunidadRepository);

            if (op.OrdenCompra == null)
                throw new InvalidOperationException("Primero debe registrar la Orden de Compra.");

            if (op.OrdenCompra.EstadoOC != "OC_ACEPTADA")
                throw new InvalidOperationException(
                    "El despacho solo puede registrarse sobre una OC aceptada (OC_ACEPTADA).");

            op.OrdenCompra.FechaDespacho = dto.FechaDespacho.HasValue
                ? (dto.FechaDespacho.Value.Kind == DateTimeKind.Utc ? dto.FechaDespacho.Value : DateTime.SpecifyKind(dto.FechaDespacho.Value, DateTimeKind.Utc))
                : null;
            op.OrdenCompra.Transportista = dto.Transportista?.Trim();
            op.OrdenCompra.NoGuiaRemision = dto.NoGuiaRemision?.Trim();
            op.OrdenCompra.FechaEntrega = dto.FechaEntrega.HasValue
                ? (dto.FechaEntrega.Value.Kind == DateTimeKind.Utc ? dto.FechaEntrega.Value : DateTime.SpecifyKind(dto.FechaEntrega.Value, DateTimeKind.Utc))
                : null;
            op.OrdenCompra.EstadoOC = "ENTREGADA";
            op.OrdenCompra.FechaActualizacion = DateTime.UtcNow;

            op.Estado = "ENTREGADA";
            op.FechaActualizacion = DateTime.UtcNow;

            await _oportunidadRepository.ActualizarAsync(op);
            return (await ObtenerPorIdAsync(op.Id))!;
        }

        // ── STORAGE DE IMÁGENES / EVIDENCIAS (1 Oportunidad - 1,N Imágenes en PostgreSQL BYTEA) ──
        public async Task<IEnumerable<OportunidadImagenDto>> ObtenerImagenesAsync(int oportunidadId)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(oportunidadId);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con ID '{oportunidadId}' no encontrada.");

            var imagenes = await _oportunidadRepository.ObtenerImagenesAsync(oportunidadId);

            return imagenes.Select(i => new OportunidadImagenDto
            {
                Id = i.Id,
                OportunidadId = i.OportunidadId,
                NumeroRequerimiento = op.NumeroRequerimiento,
                TipoEvidencia = i.TipoEvidencia,
                TipoEvidenciaId = i.TipoEvidenciaId,
                NombreTipo = i.TipoEvidenciaRef?.Nombre,
                NombreArchivo = i.NombreArchivo,
                ContentType = i.ContentType,
                TamanoBytes = i.TamanoBytes,
                TamanoArchivo = i.TamanoArchivo,
                Comentario = i.Comentario,
                SubidoPor = i.SubidoPor,
                SubidoPorUsuarioId = i.SubidoPorUsuarioId,
                FechaSubida = i.FechaSubida,
                Url = $"/api/oportunidades/{i.OportunidadId}/imagenes/{i.Id}/archivo"
            });
        }

        public async Task<(byte[] datos, string contentType, string nombreArchivo)?> ObtenerArchivoImagenAsync(int imagenId)
        {
            var imagen = await _oportunidadRepository.ObtenerImagenPorIdAsync(imagenId);
            if (imagen == null) return null;

            return (imagen.Datos, imagen.ContentType, imagen.NombreArchivo);
        }

        public async Task<OportunidadImagenDto> SubirImagenAsync(
            int oportunidadId,
            Stream archivoStream,
            string nombreArchivo,
            string contentType,
            SubirOportunidadImagenDto dto,
            string? usuarioId,
            string? usuarioNombre)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(oportunidadId);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con ID '{oportunidadId}' no encontrada.");

            if (archivoStream == null || archivoStream.Length == 0)
                throw new InvalidOperationException("No se ha enviado ningún archivo de imagen.");

            // ── TYPE OF EVIDENCE: auto-asignación sin combo de tipos ──
            // Si el archivo es PDF se asume cotización de la marca; las capturas/imágenes
            // se registran como "Captura de Evidencia" por defecto.
            var extensionArchivo = Path.GetExtension(nombreArchivo).ToLowerInvariant();
            var esPdf = extensionArchivo == ".pdf"
                || (!string.IsNullOrWhiteSpace(contentType) && contentType.ToLowerInvariant().Contains("application/pdf"));

            var tipoName = string.IsNullOrWhiteSpace(dto.TipoEvidencia)
                ? (esPdf ? "Cotización de Marca" : "Captura de Evidencia")
                : dto.TipoEvidencia.Trim();

            var tipos = await _oportunidadRepository.ObtenerTiposEvidenciaAsync();
            var tipo = tipos.FirstOrDefault(t => t.Nombre.Equals(tipoName, StringComparison.OrdinalIgnoreCase));

            if (tipo == null && dto.TipoEvidenciaId.HasValue)
            {
                tipo = tipos.FirstOrDefault(t => t.Id == dto.TipoEvidenciaId.Value);
                tipoName = tipo?.Nombre ?? tipoName;
            }

            var nombreTipo = tipo?.Nombre ?? tipoName;
            var esCotizacionMarca = nombreTipo.Equals("Cotización de Marca", StringComparison.OrdinalIgnoreCase);

            // VALIDACIÓN DE FORMATO: imágenes siempre; PDF solo para "Cotización de Marca"
            var allowedMimeTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/jpg" };
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

            if (esCotizacionMarca)
            {
                allowedMimeTypes = allowedMimeTypes.Append("application/pdf").ToArray();
                allowedExtensions = allowedExtensions.Append(".pdf").ToArray();
            }

            var extension = Path.GetExtension(nombreArchivo).ToLowerInvariant();
            var mimeValid = !string.IsNullOrWhiteSpace(contentType) && allowedMimeTypes.Contains(contentType.ToLowerInvariant());
            var extValid = allowedExtensions.Contains(extension);

            if (!mimeValid && !extValid)
            {
                throw new InvalidOperationException(
                    esCotizacionMarca
                        ? "Para la cotización de la marca solo se permiten archivos PDF (o imágenes JPG, PNG, WEBP)."
                        : "Solo se permiten subir imágenes (JPG, PNG, WEBP). Los documentos PDF u otros formatos no están permitidos en esta sección.");
            }

            // Límite de tamaño: 25 MB
            if (archivoStream.Length > 25 * 1024 * 1024)
            {
                throw new InvalidOperationException("El tamaño máximo permitido para el archivo es de 25 MB.");
            }

            byte[] bytes;
            using (var memoryStream = new MemoryStream())
            {
                await archivoStream.CopyToAsync(memoryStream);
                bytes = memoryStream.ToArray();
            }

            var tamanoArchivo = bytes.Length >= 1024 * 1024
                ? $"{(bytes.Length / (1024.0 * 1024.0)):F2} MB"
                : $"{(bytes.Length / 1024.0):F1} KB";

            var cleanContentType = mimeValid ? contentType.ToLowerInvariant() : (extension switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".pdf" => "application/pdf",
                _ => "image/jpeg"
            });

            var imagen = new OportunidadImagen
            {
                OportunidadId = oportunidadId,
                TipoEvidencia = nombreTipo,
                TipoEvidenciaId = tipo?.Id,
                NombreArchivo = Path.GetFileName(nombreArchivo),
                ContentType = cleanContentType,
                TamanoBytes = bytes.Length,
                TamanoArchivo = tamanoArchivo,
                Datos = bytes,
                Comentario = dto.Comentario?.Trim(),
                SubidoPor = !string.IsNullOrWhiteSpace(usuarioNombre) ? usuarioNombre : "Usuario Actual",
                SubidoPorUsuarioId = usuarioId,
                FechaSubida = DateTime.UtcNow
            };

            var creada = await _oportunidadRepository.AgregarImagenAsync(imagen);

            return new OportunidadImagenDto
            {
                Id = creada.Id,
                OportunidadId = creada.OportunidadId,
                NumeroRequerimiento = op.NumeroRequerimiento,
                TipoEvidencia = creada.TipoEvidencia,
                TipoEvidenciaId = creada.TipoEvidenciaId,
                NombreTipo = creada.TipoEvidenciaRef?.Nombre,
                NombreArchivo = creada.NombreArchivo,
                ContentType = creada.ContentType,
                TamanoBytes = creada.TamanoBytes,
                TamanoArchivo = creada.TamanoArchivo,
                Comentario = creada.Comentario,
                SubidoPor = creada.SubidoPor,
                SubidoPorUsuarioId = creada.SubidoPorUsuarioId,
                FechaSubida = creada.FechaSubida,
                Url = $"/api/oportunidades/{creada.OportunidadId}/imagenes/{creada.Id}/archivo"
            };
        }

        public async Task<bool> EliminarImagenAsync(int oportunidadId, int imagenId, string? usuarioId, bool esAdmin = false)
        {
            var imagen = await _oportunidadRepository.ObtenerImagenPorIdAsync(imagenId);
            if (imagen == null || imagen.OportunidadId != oportunidadId)
                return false;

            // Seguridad: Solo el usuario que la subió o un administrador puede eliminarla
            if (!esAdmin && !string.IsNullOrEmpty(imagen.SubidoPorUsuarioId) && imagen.SubidoPorUsuarioId != usuarioId)
                throw new UnauthorizedAccessException("Solo puedes eliminar evidencias subidas por tu propio usuario.");

            return await _oportunidadRepository.EliminarImagenAsync(imagenId);
        }

        private static OportunidadResponseDto MapToResponseDto(Oportunidad op)
        {
            return new OportunidadResponseDto
            {
                Id = op.Id,
                NumeroRequerimiento = op.NumeroRequerimiento,
                AcuerdoMarcoId = op.AcuerdoMarcoId,
                AcuerdoMarcoCodigo = op.AcuerdoMarco?.Codigo,
                AcuerdoMarcoDescripcion = op.AcuerdoMarco?.Descipcion,
                FechaVencimientoLicitacion = op.FechaVencimientoLicitacion,
                EmpresaId = op.EmpresaId,
                EmpresaRazonSocial = op.Empresa?.RazonSocial,
                EmpresaRuc = op.Empresa?.Ruc,
                EntidadConvocante = op.EntidadConvocante,
                LimiteTotal = op.LimiteTotal,
                Estado = op.Estado,
                EstaBloqueada = op.EstaBloqueada,
                MotivoDesestimacion = op.MotivoDesestimacion,
                CreadoPorUsuarioId = op.CreadoPorUsuarioId,
                CreadoPorNombre = op.CreadoPorUsuario?.UserName,
                FechaRegistro = op.FechaRegistro,
                FechaActualizacion = op.FechaActualizacion,
                Marcas = op.OportunidadMarcas.Select(om => new MarcaDto
                {
                    Id = om.MarcaId,
                    Nombre = om.Marca?.Nombre ?? string.Empty
                }).ToList(),
                Imagenes = op.Imagenes.Select(i => new OportunidadImagenDto
                {
                    Id = i.Id,
                    OportunidadId = i.OportunidadId,
                    NumeroRequerimiento = op.NumeroRequerimiento,
                    TipoEvidencia = i.TipoEvidencia,
                    TipoEvidenciaId = i.TipoEvidenciaId,
                    NombreTipo = i.TipoEvidenciaRef?.Nombre,
                    NombreArchivo = i.NombreArchivo,
                    ContentType = i.ContentType,
                    TamanoBytes = i.TamanoBytes,
                    TamanoArchivo = i.TamanoArchivo,
                    Comentario = i.Comentario,
                    SubidoPor = i.SubidoPor,
                    SubidoPorUsuarioId = i.SubidoPorUsuarioId,
                    FechaSubida = i.FechaSubida,
                    Url = $"/api/oportunidades/{i.OportunidadId}/imagenes/{i.Id}/archivo"
                }).ToList(),
                Productos = op.Productos.Select(p => new ProductoResponseDto
                {
                    Id = p.Id,
                    NumeroParte = p.NumeroParte,
                    Descripcion = p.Descripcion,
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = p.LimiteSubtotal,
                    FichaProducto = p.FichaProducto,
                    MarcaProducto = p.MarcaProducto,
                    Moneda = p.Moneda,
                    PrecioUnitarioBase = p.PrecioUnitarioBase,
                    PrecioUnitarioOfertado = p.PrecioUnitarioOfertado,
                    CondicionesAdicionales = p.CondicionesAdicionales,
                    FichaTecnica = p.FichaTecnica,
                    AjusteFletePorcentaje = p.AjusteFletePorcentaje,
                    AjusteFleteSolicitadoPorcentaje = p.AjusteFleteSolicitadoPorcentaje,
                    AjusteFleteMotivo = p.AjusteFleteMotivo,
                    AjusteFleteEstado = p.AjusteFleteEstado,
                    AjusteFleteComentarioAdmin = p.AjusteFleteComentarioAdmin,
                    Proveedores = p.Proveedores.Select(pv => new ItemProveedorResponseDto
                    {
                        Id = pv.Id,
                        NombreProveedor = pv.NombreProveedor,
                        Cantidad = pv.Cantidad,
                        CostoUnitario = pv.CostoUnitario,
                        CostoEnvio = pv.CostoEnvio,
                        Subtotal = pv.Cantidad * pv.CostoUnitario + pv.CostoEnvio
                    }).ToList(),
                    CantidadAsignada = p.Proveedores.Sum(pv => pv.Cantidad),
                    CostoTotalProveedores = p.Proveedores.Sum(pv => pv.Cantidad * pv.CostoUnitario + pv.CostoEnvio)
                }).ToList(),
                OrdenCompra = op.OrdenCompra == null ? null : new OrdenCompraResponseDto
                {
                    Id = op.OrdenCompra.Id,
                    OportunidadId = op.OrdenCompra.OportunidadId,
                    NumeroOC = op.OrdenCompra.NumeroOC,
                    FechaEmisionOC = op.OrdenCompra.FechaEmisionOC,
                    EstadoOC = op.OrdenCompra.EstadoOC,
                    MotivoRechazo = op.OrdenCompra.MotivoRechazo,
                    FechaDecisionOC = op.OrdenCompra.FechaDecisionOC,
                    CostoInicial = op.OrdenCompra.CostoInicial,
                    CostoRenegociado = op.OrdenCompra.CostoRenegociado,
                    MargenAdicional = op.OrdenCompra.MargenAdicional,
                    FechaRenegociacion = op.OrdenCompra.FechaRenegociacion,
                    FechaDespacho = op.OrdenCompra.FechaDespacho,
                    Transportista = op.OrdenCompra.Transportista,
                    NoGuiaRemision = op.OrdenCompra.NoGuiaRemision,
                    FechaEntrega = op.OrdenCompra.FechaEntrega,
                    NroOCAM = op.OrdenCompra.NroOCAM,
                    NroExpediente = op.OrdenCompra.NroExpediente,
                    Unidad = op.OrdenCompra.Unidad,
                    CodigoCIAF = op.OrdenCompra.CodigoCIAF,
                    MontoOCAM = op.OrdenCompra.MontoOCAM,
                    FechaRegistro = op.OrdenCompra.FechaRegistro,
                    FechaActualizacion = op.OrdenCompra.FechaActualizacion
                }
            };
        }
    }
}

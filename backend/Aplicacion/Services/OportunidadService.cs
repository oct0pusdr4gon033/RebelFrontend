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


            // Validar Acuerdo Marco
            var acuerdo = await _acuerdoMarcoRepository.ObtenerPorIdAsync(dto.AcuerdoMarcoId);
            if (acuerdo == null)
                throw new InvalidOperationException($"El Acuerdo Marco con Id '{dto.AcuerdoMarcoId}' no existe.");

            // Validar Empresa si fue enviada (opcional)
            if (dto.EmpresaId.HasValue && dto.EmpresaId.Value > 0)
            {
                var empresa = await _empresaRepository.ObtenerPorIdAsync(dto.EmpresaId.Value);
                if (empresa == null)
                    throw new InvalidOperationException($"La Empresa con Id '{dto.EmpresaId}' no existe.");
            }

            var oportunidad = new Oportunidad
            {
                NumeroRequerimiento = dto.NumeroRequerimiento.Trim().ToUpper(),
                AcuerdoMarcoId = dto.AcuerdoMarcoId,
                FechaVencimientoLicitacion = dto.FechaVencimientoLicitacion.HasValue 
                    ? (dto.FechaVencimientoLicitacion.Value.Kind == DateTimeKind.Utc 
                        ? dto.FechaVencimientoLicitacion.Value 
                        : DateTime.SpecifyKind(dto.FechaVencimientoLicitacion.Value, DateTimeKind.Utc))
                    : null,
                EmpresaId = dto.EmpresaId > 0 ? dto.EmpresaId : null,
                EntidadConvocante = dto.EntidadConvocante?.Trim(),
                CreadoPorUsuarioId = usuarioId,
                FechaRegistro = DateTime.UtcNow,
                Estado = "En Licitación"
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
                var subtotal = p.Cantidad * p.LimiteUnitario;
                oportunidad.Productos.Add(new OportunidadProducto
                {
                    NumeroParte = p.NumeroParte.Trim(),
                    Descripcion = p.Descripcion?.Trim(),
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = subtotal
                });
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
        public async Task<OportunidadResponseDto> ActualizarAsync(int id, ActualizarOportunidadDto dto)
        {
            var op = await _oportunidadRepository.ObtenerPorIdAsync(id);
            if (op == null)
                throw new KeyNotFoundException($"Oportunidad con Id '{id}' no encontrada.");

            // ── PROTECCIÓN: LOS DATOS DE CONVOCATORIA PERÚ COMPRAS NO SE MODIFICAN ──
            // op.NumeroRequerimiento       -> INALTERADO
            // op.AcuerdoMarcoId           -> INALTERADO
            // op.FechaVencimientoLicitacion -> INALTERADO

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

            // ── EDICIÓN 3: ACTUALIZAR PRODUCTOS Y LÍMITES ──
            op.Productos.Clear();
            foreach (var p in dto.Productos)
            {
                var subtotal = p.Cantidad * p.LimiteUnitario;
                op.Productos.Add(new OportunidadProducto
                {
                    OportunidadId = op.Id,
                    NumeroParte = p.NumeroParte.Trim(),
                    Descripcion = p.Descripcion?.Trim(),
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = subtotal
                });
            }

            // Recalcular Límite Total de la Oportunidad
            op.LimiteTotal = op.Productos.Sum(p => p.LimiteSubtotal);
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
                var subtotal = p.Cantidad * p.LimiteUnitario;
                op.Productos.Add(new OportunidadProducto
                {
                    OportunidadId = op.Id,
                    NumeroParte = p.NumeroParte.Trim(),
                    Descripcion = p.Descripcion?.Trim(),
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = subtotal
                });
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

            var subtotal = producto.Cantidad * producto.LimiteUnitario;
            op.Productos.Add(new OportunidadProducto
            {
                OportunidadId = op.Id,
                NumeroParte = producto.NumeroParte.Trim(),
                Descripcion = producto.Descripcion?.Trim(),
                Cantidad = producto.Cantidad,
                LimiteUnitario = producto.LimiteUnitario,
                LimiteSubtotal = subtotal
            });

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

        public async Task<bool> EliminarAsync(int id)
        {
            return await _oportunidadRepository.EliminarAsync(id);
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
                CreadoPorUsuarioId = op.CreadoPorUsuarioId,
                CreadoPorNombre = op.CreadoPorUsuario?.UserName,
                FechaRegistro = op.FechaRegistro,
                FechaActualizacion = op.FechaActualizacion,
                Marcas = op.OportunidadMarcas.Select(om => new MarcaDto
                {
                    Id = om.MarcaId,
                    Nombre = om.Marca?.Nombre ?? string.Empty
                }).ToList(),
                Productos = op.Productos.Select(p => new ProductoResponseDto
                {
                    Id = p.Id,
                    NumeroParte = p.NumeroParte,
                    Descripcion = p.Descripcion,
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = p.LimiteSubtotal
                }).ToList()
            };
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RebelQueenBack.Application.Dtos;
using RebelQueenBack.Core.Entities;
using RebelQueenBack.Infrastructure.Data;

namespace RebelQueenBack.Application.Services
{
    public class OportunidadService : IOportunidadService
    {
        private readonly ApplicationDbContext _context;

        public OportunidadService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<OportunidadResponseDto>> ObtenerTodasAsync()
        {
            var oportunidades = await _context.Oportunidades
                .Include(o => o.AcuerdoMarco)
                .Include(o => o.OportunidadMarcas)
                    .ThenInclude(om => om.Marca)
                .Include(o => o.Productos)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return oportunidades.Select(MapToResponseDto);
        }

        public async Task<OportunidadResponseDto?> ObtenerPorIdAsync(Guid id)
        {
            var op = await _context.Oportunidades
                .Include(o => o.AcuerdoMarco)
                .Include(o => o.OportunidadMarcas)
                    .ThenInclude(om => om.Marca)
                .Include(o => o.Productos)
                .FirstOrDefaultAsync(o => o.Id == id);

            return op == null ? null : MapToResponseDto(op);
        }

        public async Task<OportunidadResponseDto> CrearAsync(CrearOportunidadDto dto, string? usuarioId = null)
        {
            // Validar que exista el Acuerdo Marco
            var existeAcuerdo = await _context.AcuerdosMarco.AnyAsync(a => a.Id == dto.AcuerdoMarcoId);
            if (!existeAcuerdo)
                throw new InvalidOperationException($"El Acuerdo Marco con Id '{dto.AcuerdoMarcoId}' no existe.");

            var oportunidad = new Oportunidad
            {
                Id = Guid.NewGuid(),
                NumeroRequerimiento = dto.NumeroRequerimiento.Trim().ToUpper(),
                AcuerdoMarcoId = dto.AcuerdoMarcoId,
                FechaVencimientoLicitacion = dto.FechaVencimientoLicitacion,
                CreadoPorUsuarioId = usuarioId,
                CreatedAt = DateTime.UtcNow,
                Estado = "En Licitación"
            };

            // 1. Asignar Marcas participantes
            foreach (var marcaId in dto.MarcaIds.Distinct())
            {
                oportunidad.OportunidadMarcas.Add(new OportunidadMarca
                {
                    OportunidadId = oportunidad.Id,
                    MarcaId = marcaId
                });
            }

            // 2. Asignar Productos con cálculo de subtotales
            foreach (var p in dto.Productos)
            {
                var subtotal = p.Cantidad * p.LimiteUnitario;
                oportunidad.Productos.Add(new OportunidadProducto
                {
                    Id = Guid.NewGuid(),
                    OportunidadId = oportunidad.Id,
                    NumeroParte = p.NumeroParte.Trim(),
                    Descripcion = p.Descripcion?.Trim(),
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = subtotal
                });
            }

            // 3. Calcular Límite Total de la Oportunidad
            oportunidad.LimiteTotal = oportunidad.Productos.Sum(p => p.LimiteSubtotal);

            _context.Oportunidades.Add(oportunidad);
            await _context.SaveChangesAsync();

            return (await ObtenerPorIdAsync(oportunidad.Id))!;
        }

        /// <summary>
        /// REGLA DE NEGOCIO:
        /// 1. Datos de la Convocatoria Perú Compras (Requerimiento, Acuerdo Marco, Fecha Vencimiento) -> NO SE EDITAN
        /// 2. Marcas y Productos/Límites del Requerimiento -> SE EDITAN
        /// </summary>
        public async Task<OportunidadResponseDto> ActualizarAsync(Guid id, ActualizarOportunidadDto dto)
        {
            var oportunidad = await _context.Oportunidades
                .Include(o => o.OportunidadMarcas)
                .Include(o => o.Productos)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (oportunidad == null)
                throw new KeyNotFoundException($"No se encontró la oportunidad con Id '{id}'.");

            // ── PROTECCIÓN: LOS DATOS DE CONVOCATORIA NO SE MODIFICAN ──
            // oportunidad.NumeroRequerimiento = ... (INALTERADO)
            // oportunidad.AcuerdoMarcoId = ... (INALTERADO)
            // oportunidad.FechaVencimientoLicitacion = ... (INALTERADO)

            // ── EDICIÓN 1: ACTUALIZAR MARCAS PARTICIPANTES ──
            _context.OportunidadMarcas.RemoveRange(oportunidad.OportunidadMarcas);
            oportunidad.OportunidadMarcas.Clear();

            foreach (var marcaId in dto.MarcaIds.Distinct())
            {
                oportunidad.OportunidadMarcas.Add(new OportunidadMarca
                {
                    OportunidadId = oportunidad.Id,
                    MarcaId = marcaId
                });
            }

            // ── EDICIÓN 2: ACTUALIZAR PRODUCTOS Y LÍMITES ──
            _context.OportunidadProductos.RemoveRange(oportunidad.Productos);
            oportunidad.Productos.Clear();

            foreach (var p in dto.Productos)
            {
                var subtotal = p.Cantidad * p.LimiteUnitario;
                oportunidad.Productos.Add(new OportunidadProducto
                {
                    Id = Guid.NewGuid(),
                    OportunidadId = oportunidad.Id,
                    NumeroParte = p.NumeroParte.Trim(),
                    Descripcion = p.Descripcion?.Trim(),
                    Cantidad = p.Cantidad,
                    LimiteUnitario = p.LimiteUnitario,
                    LimiteSubtotal = subtotal
                });
            }

            // Recalcular Límite Total de la Oportunidad
            oportunidad.LimiteTotal = oportunidad.Productos.Sum(p => p.LimiteSubtotal);
            oportunidad.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return (await ObtenerPorIdAsync(oportunidad.Id))!;
        }

        public async Task<bool> EliminarAsync(Guid id)
        {
            var op = await _context.Oportunidades.FindAsync(id);
            if (op == null) return false;

            _context.Oportunidades.Remove(op);
            await _context.SaveChangesAsync();
            return true;
        }

        private static OportunidadResponseDto MapToResponseDto(Oportunidad op)
        {
            return new OportunidadResponseDto
            {
                Id = op.Id,
                NumeroRequerimiento = op.NumeroRequerimiento,
                AcuerdoMarcoId = op.AcuerdoMarcoId,
                AcuerdoMarcoCodigo = op.AcuerdoMarco?.Codigo,
                AcuerdoMarcoDescripcion = op.AcuerdoMarco?.Descripcion,
                FechaVencimientoLicitacion = op.FechaVencimientoLicitacion,
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
                }).ToList(),
                LimiteTotal = op.LimiteTotal,
                Estado = op.Estado,
                CreatedAt = op.CreatedAt,
                UpdatedAt = op.UpdatedAt
            };
        }
    }
}

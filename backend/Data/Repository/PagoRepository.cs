using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Data.Context;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Data.Repository
{
    public class PagoRepository : IPagoRepository
    {
        private readonly AppDBContext _context;

        public PagoRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<PagoOC>> ObtenerTodosAsync()
        {
            return await _context.Pagos
                .OrderByDescending(p => p.FechaRegistro)
                .ToListAsync();
        }

        public async Task<PagoOC?> ObtenerPorIdAsync(int id)
        {
            return await _context.Pagos.FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<PagoOC>> ObtenerPorOCAsync(string numeroOC)
        {
            var clean = numeroOC.Trim().ToLower();
            return await _context.Pagos
                .Where(p => p.NumeroOC.ToLower() == clean || p.NumeroRequerimiento.ToLower() == clean)
                .OrderByDescending(p => p.FechaPago)
                .ToListAsync();
        }

        public async Task<IEnumerable<PagoOC>> ObtenerPorOportunidadIdAsync(int oportunidadId)
        {
            return await _context.Pagos
                .Where(p => p.OportunidadId == oportunidadId)
                .OrderByDescending(p => p.FechaPago)
                .ToListAsync();
        }

        public async Task<string> GenerarSiguienteCodigoAsync()
        {
            var anio = DateTime.UtcNow.Year;
            var prefijo = $"PAG-{anio}-";

            var codigosDelAnio = await _context.Pagos
                .Where(p => p.CodigoPago.StartsWith(prefijo))
                .Select(p => p.CodigoPago)
                .ToListAsync();

            int maxNumero = 0;
            foreach (var cod in codigosDelAnio)
            {
                var numStr = cod.Replace(prefijo, "");
                if (int.TryParse(numStr, out int num) && num > maxNumero)
                {
                    maxNumero = num;
                }
            }

            var siguiente = maxNumero + 1;
            return $"{prefijo}{siguiente.ToString().PadLeft(4, '0')}";
        }

        public async Task<PagoOC> CrearAsync(PagoOC pago)
        {
            if (string.IsNullOrWhiteSpace(pago.CodigoPago))
            {
                pago.CodigoPago = await GenerarSiguienteCodigoAsync();
            }

            await _context.Pagos.AddAsync(pago);
            await _context.SaveChangesAsync();
            return pago;
        }

        public async Task<bool> EliminarAsync(int id)
        {
            var pago = await _context.Pagos.FindAsync(id);
            if (pago == null) return false;

            _context.Pagos.Remove(pago);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Data.Context;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Data.Repository
{
    public class OportunidadRepository : IOportunidadRepository
    {
        private readonly AppDBContext _context;

        public OportunidadRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Oportunidad>> ObtenerTodasAsync()
        {
            return await _context.Oportunidades
                .Include(o => o.AcuerdoMarco)
                .Include(o => o.Empresa)
                .Include(o => o.CreadoPorUsuario)
                .Include(o => o.OportunidadMarcas)
                    .ThenInclude(om => om.Marca)
                .Include(o => o.Productos)
                .OrderByDescending(o => o.FechaRegistro)
                .ToListAsync();
        }

        public async Task<Oportunidad?> ObtenerPorIdAsync(int id)
        {
            return await _context.Oportunidades
                .Include(o => o.AcuerdoMarco)
                .Include(o => o.Empresa)
                .Include(o => o.CreadoPorUsuario)
                .Include(o => o.OportunidadMarcas)
                    .ThenInclude(om => om.Marca)
                .Include(o => o.Productos)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<Oportunidad> CrearAsync(Oportunidad oportunidad)
        {
            _context.Oportunidades.Add(oportunidad);
            await _context.SaveChangesAsync();
            return oportunidad;
        }

        public async Task<Oportunidad> ActualizarAsync(Oportunidad oportunidad)
        {
            _context.Oportunidades.Update(oportunidad);
            await _context.SaveChangesAsync();
            return oportunidad;
        }

        public async Task<bool> EliminarAsync(int id)
        {
            var op = await _context.Oportunidades.FindAsync(id);
            if (op == null) return false;

            _context.Oportunidades.Remove(op);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ExisteRequerimientoAsync(string numeroRequerimiento)
        {
            return await _context.Oportunidades
                .AnyAsync(o => o.NumeroRequerimiento.ToLower() == numeroRequerimiento.Trim().ToLower());
        }
    }
}

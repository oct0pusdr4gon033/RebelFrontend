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
    public class SedeRepository : ISedeRepository
    {
        private readonly AppDBContext _context;

        public SedeRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Sede>> ObtenerTodasAsync(bool incluirInactivas = false)
        {
            var query = _context.Sedes.Include(s => s.Empleados).AsQueryable();
            if (!incluirInactivas)
                query = query.Where(s => s.Activo);
            return await query.OrderBy(s => s.NombreSede).ToListAsync();
        }

        public async Task<Sede?> ObtenerPorIdAsync(int id)
        {
            return await _context.Sedes
                .Include(s => s.Empleados)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Sede> CrearAsync(Sede sede)
        {
            _context.Sedes.Add(sede);
            await _context.SaveChangesAsync();
            return sede;
        }

        public async Task<Sede> ActualizarAsync(Sede sede)
        {
            _context.Sedes.Update(sede);
            await _context.SaveChangesAsync();
            return sede;
        }

        public async Task<bool> EliminarSoftAsync(int id)
        {
            var sede = await _context.Sedes.FindAsync(id);
            if (sede == null) return false;
            sede.Activo = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestaurarAsync(int id)
        {
            var sede = await _context.Sedes.FindAsync(id);
            if (sede == null) return false;
            sede.Activo = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ExisteNombreAsync(string nombre, int? excludeId = null)
        {
            var query = _context.Sedes.Where(s => s.NombreSede.ToLower() == nombre.Trim().ToLower());
            if (excludeId.HasValue)
                query = query.Where(s => s.Id != excludeId.Value);
            return await query.AnyAsync();
        }
    }
}

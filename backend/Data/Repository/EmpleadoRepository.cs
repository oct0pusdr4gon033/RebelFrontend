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
    public class EmpleadoRepository : IEmpleadoRepository
    {
        private readonly AppDBContext _context;

        public EmpleadoRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Empleado>> ObtenerTodosAsync(bool incluirInactivos = false)
        {
            var query = _context.Empleados
                .Include(e => e.Sede)
                .Include(e => e.Usuario)
                .Include(e => e.Rol)
                .AsQueryable();

            if (!incluirInactivos)
                query = query.Where(e => e.Activo);

            return await query.OrderBy(e => e.Apellidos).ThenBy(e => e.Nombres).ToListAsync();
        }

        public async Task<Empleado?> ObtenerPorIdAsync(int id)
        {
            return await _context.Empleados
                .Include(e => e.Sede)
                .Include(e => e.Usuario)
                .Include(e => e.Rol)
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<Empleado?> ObtenerPorDniAsync(string dni)
        {
            return await _context.Empleados
                .Include(e => e.Sede)
                .Include(e => e.Usuario)
                .Include(e => e.Rol)
                .FirstOrDefaultAsync(e => e.DNI.Trim() == dni.Trim());
        }

        public async Task<Empleado?> ObtenerPorUserIdAsync(string userId)
        {
            return await _context.Empleados
                .Include(e => e.Sede)
                .Include(e => e.Usuario)
                .Include(e => e.Rol)
                .FirstOrDefaultAsync(e => e.UserId == userId);
        }

        public async Task<IEnumerable<Empleado>> ObtenerPorSedeAsync(int sedeId)
        {
            return await _context.Empleados
                .Where(e => e.SedeId == sedeId && e.Activo)
                .OrderBy(e => e.Apellidos)
                .ToListAsync();
        }

        public async Task<Empleado> CrearAsync(Empleado empleado)
        {
            _context.Empleados.Add(empleado);
            await _context.SaveChangesAsync();
            return empleado;
        }

        public async Task<Empleado> ActualizarAsync(Empleado empleado)
        {
            _context.Empleados.Update(empleado);
            await _context.SaveChangesAsync();
            return empleado;
        }

        public async Task<bool> EliminarSoftAsync(int id)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null) return false;
            empleado.Activo = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestaurarAsync(int id)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null) return false;
            empleado.Activo = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarAsync(int id)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null) return false;
            _context.Empleados.Remove(empleado);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ExisteDniAsync(string dni, int? excludeId = null)
        {
            var query = _context.Empleados.Where(e => e.DNI.Trim() == dni.Trim());
            if (excludeId.HasValue)
                query = query.Where(e => e.Id != excludeId.Value);
            return await query.AnyAsync();
        }
    }
}

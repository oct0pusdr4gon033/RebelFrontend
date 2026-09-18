using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Data.Context;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Data.Repository
{
    public class EmpresaRepository : IEmpresaRepository
    {
        private readonly AppDBContext _context;

        public EmpresaRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Empresa>> ObtenerTodasAsync()
        {
            return await _context.Empresas
                .Where(e => e.Activo)
                .OrderBy(e => e.RazonSocial)
                .ToListAsync();
        }

        public async Task<(IEnumerable<Empresa> items, int total)> ObtenerPaginadoAsync(string? busqueda, int pagina, int tamanoPagina)
        {
            var query = _context.Empresas.Where(e => e.Activo).AsQueryable();

            if (!string.IsNullOrWhiteSpace(busqueda))
            {
                busqueda = busqueda.ToLower();
                query = query.Where(e => e.RazonSocial.ToLower().Contains(busqueda) || e.Ruc.Contains(busqueda));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(e => e.RazonSocial)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .ToListAsync();

            return (items, total);
        }

        public async Task<Empresa?> ObtenerPorIdAsync(int id)
        {
            return await _context.Empresas.FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<Empresa?> ObtenerPorRucAsync(string ruc)
        {
            return await _context.Empresas
                .FirstOrDefaultAsync(e => e.Ruc.Trim() == ruc.Trim());
        }

        public async Task<Empresa> CrearAsync(Empresa empresa)
        {
            _context.Empresas.Add(empresa);
            await _context.SaveChangesAsync();
            return empresa;
        }
    }
}

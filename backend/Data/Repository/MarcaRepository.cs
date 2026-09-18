using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Data.Context;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Data.Repository
{
    public class MarcaRepository : IMarcaRepository
    {
        private readonly AppDBContext _context;

        public MarcaRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Marca>> ObtenerTodasAsync()
        {
            return await _context.Marcas
                .Where(m => m.Activo)
                .OrderBy(m => m.Nombre)
                .ToListAsync();
        }

        public async Task<Marca?> ObtenerPorIdAsync(int id)
        {
            return await _context.Marcas.FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<Marca> CrearAsync(Marca marca)
        {
            _context.Marcas.Add(marca);
            await _context.SaveChangesAsync();
            return marca;
        }
    }
}

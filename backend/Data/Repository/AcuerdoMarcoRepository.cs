using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Data.Context;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Data.Repository
{
    public class AcuerdoMarcoRepository : IAcuerdoMarcoRepository
    {
        private readonly AppDBContext _context;

        public AcuerdoMarcoRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AcuerdoMarco>> ObtenerTodosAsync()
        {
            return await _context.AcuerdosMarco
                .Where(a => a.Activo)
                .OrderBy(a => a.Codigo)
                .ToListAsync();
        }

        public async Task<AcuerdoMarco?> ObtenerPorIdAsync(int id)
        {
            return await _context.AcuerdosMarco.FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<AcuerdoMarco?> ObtenerPorCodigoAsync(string codigo)
        {
            return await _context.AcuerdosMarco
                .FirstOrDefaultAsync(a => a.Codigo.ToLower() == codigo.Trim().ToLower());
        }
    }
}

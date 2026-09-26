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
                .Include(o => o.OrdenCompra)
                .Include(o => o.Imagenes)
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
                .Include(o => o.OrdenCompra)
                .Include(o => o.Imagenes)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<Oportunidad?> ObtenerPorRequerimientoAsync(string numeroRequerimiento)
        {
            return await _context.Oportunidades
                .Include(o => o.CreadoPorUsuario)
                    .ThenInclude(u => u!.Empleado)
                .FirstOrDefaultAsync(o => o.NumeroRequerimiento.ToLower() == numeroRequerimiento.Trim().ToLower());
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

        public async Task<bool> ExisteParaUsuarioAsync(string numeroRequerimiento, string usuarioId)
        {
            return await _context.Oportunidades
                .AnyAsync(o => o.NumeroRequerimiento.ToUpper() == numeroRequerimiento.Trim().ToUpper() && o.CreadoPorUsuarioId == usuarioId);
        }

        public async Task<bool> ExisteBuenaProAsync(string numeroRequerimiento, int? excluirId = null)
        {
            var reqNorm = (numeroRequerimiento ?? string.Empty).Trim().ToUpper();
            var estadosBuenaPro = new[] { "Adjudicada", "OC_RECIBIDA", "OC_ACEPTADA", "ENTREGADA" };
            
            var query = _context.Oportunidades
                .Where(o => o.NumeroRequerimiento.ToUpper() == reqNorm && estadosBuenaPro.Contains(o.Estado));

            if (excluirId.HasValue && excluirId.Value > 0)
            {
                query = query.Where(o => o.Id != excluirId.Value);
            }

            return await query.AnyAsync();
        }

        // ── STORAGE DE IMÁGENES / EVIDENCIAS (PostgreSQL BYTEA) ──
        public async Task<IEnumerable<OportunidadImagen>> ObtenerImagenesAsync(int oportunidadId)
        {
            return await _context.OportunidadImagenes
                .Where(i => i.OportunidadId == oportunidadId)
                .OrderByDescending(i => i.FechaSubida)
                .ToListAsync();
        }

        public async Task<OportunidadImagen?> ObtenerImagenPorIdAsync(int imagenId)
        {
            return await _context.OportunidadImagenes
                .Include(i => i.Oportunidad)
                .FirstOrDefaultAsync(i => i.Id == imagenId);
        }

        public async Task<OportunidadImagen> AgregarImagenAsync(OportunidadImagen imagen)
        {
            _context.OportunidadImagenes.Add(imagen);
            await _context.SaveChangesAsync();
            return imagen;
        }

        public async Task<bool> EliminarImagenAsync(int imagenId)
        {
            var imagen = await _context.OportunidadImagenes.FindAsync(imagenId);
            if (imagen == null) return false;

            _context.OportunidadImagenes.Remove(imagen);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

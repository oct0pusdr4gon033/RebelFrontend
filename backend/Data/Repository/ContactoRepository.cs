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
    public class ContactoRepository : IContactoRepository
    {
        private readonly AppDBContext _context;

        public ContactoRepository(AppDBContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ContactoOCAM>> ObtenerTodosAsync(
            string? numeroOcam = null,
            string? empresaRelacionada = null,
            string? tipoRelacion = null,
            string? busqueda = null,
            string? rucEntidad = null)
        {
            var query = _context.ContactosOCAM
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(numeroOcam))
            {
                var ocamClean = numeroOcam.ToLower().Trim();
                query = query.Where(c => c.NumeroOCAM.ToLower().Contains(ocamClean));
            }

            if (!string.IsNullOrWhiteSpace(rucEntidad))
            {
                var rucClean = rucEntidad.Trim();
                query = query.Where(c => c.RucEntidad != null && c.RucEntidad.Contains(rucClean));
            }

            if (!string.IsNullOrWhiteSpace(empresaRelacionada))
            {
                var empClean = empresaRelacionada.ToLower().Trim();
                query = query.Where(c => c.EmpresaRelacionada.ToLower().Contains(empClean));
            }

            if (!string.IsNullOrWhiteSpace(tipoRelacion))
            {
                query = query.Where(c => c.TipoRelacion == tipoRelacion);
            }

            if (!string.IsNullOrWhiteSpace(busqueda))
            {
                var term = busqueda.ToLower().Trim();
                query = query.Where(c =>
                    c.NumeroOCAM.ToLower().Contains(term) ||
                    (c.RucEntidad != null && c.RucEntidad.ToLower().Contains(term)) ||
                    c.ContactoNombre.ToLower().Contains(term) ||
                    c.ContactoNumero.Contains(term) ||
                    c.ContactoAreaCargo.ToLower().Contains(term) ||
                    c.EmpresaRelacionada.ToLower().Contains(term) ||
                    c.ContactoMotivo.ToLower().Contains(term) ||
                    c.Respuesta.ToLower().Contains(term)
                );
            }

            return await query
                .OrderByDescending(c => c.FechaRegistro)
                .ToListAsync();
        }

        public async Task<ContactoOCAM?> ObtenerPorIdAsync(int id)
        {
            return await _context.ContactosOCAM
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<ContactoOCAM> CrearAsync(ContactoOCAM contacto)
        {
            contacto.FechaRegistro = DateTime.UtcNow;
            contacto.EsInmutable = true;
            _context.ContactosOCAM.Add(contacto);
            await _context.SaveChangesAsync();
            return contacto;
        }

        public async Task<IEnumerable<ContactoOCAM>> CrearVariosAsync(IEnumerable<ContactoOCAM> contactos)
        {
            var lista = contactos.ToList();
            var ahora = DateTime.UtcNow;
            foreach (var c in lista)
            {
                c.FechaRegistro = ahora;
                c.EsInmutable = true;
            }

            await _context.ContactosOCAM.AddRangeAsync(lista);
            await _context.SaveChangesAsync();
            return lista;
        }
    }
}

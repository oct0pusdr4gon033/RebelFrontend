using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Domain.DTOs.Empresa;
using Domain.Interfaces.Repositories;
using Domain.Interfaces.Services;
using Domain.Models;

namespace Aplicacion.Services
{
    public class SedeService : ISedeService
    {
        private readonly ISedeRepository _sedeRepo;

        public SedeService(ISedeRepository sedeRepo)
        {
            _sedeRepo = sedeRepo;
        }

        public async Task<IEnumerable<SedeDto>> ObtenerTodasAsync(bool incluirInactivas = false)
        {
            var sedes = await _sedeRepo.ObtenerTodasAsync(incluirInactivas);
            return sedes.Select(MapToDto);
        }

        public async Task<SedeDto?> ObtenerPorIdAsync(int id)
        {
            var sede = await _sedeRepo.ObtenerPorIdAsync(id);
            return sede == null ? null : MapToDto(sede);
        }

        public async Task<SedeDto> CrearAsync(CrearSedeRequest request)
        {
            if (await _sedeRepo.ExisteNombreAsync(request.Nombre))
                throw new InvalidOperationException($"Ya existe una sede con el nombre '{request.Nombre}'.");

            var codigo = "SED-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            if (codigo.Length > 20) codigo = codigo[..20];

            var sede = new Sede
            {
                CodSede    = codigo,
                NombreSede = request.Nombre.Trim(),
                Ubicacion  = request.Ubicacion?.Trim() ?? string.Empty,
                Direccion  = request.Direccion?.Trim() ?? string.Empty,
                Activo     = true,
            };

            var created = await _sedeRepo.CrearAsync(sede);
            return MapToDto(created);
        }

        public async Task<SedeDto> ActualizarAsync(int id, ActualizarSedeRequest request)
        {
            var sede = await _sedeRepo.ObtenerPorIdAsync(id);
            if (sede == null)
                throw new InvalidOperationException($"Sede con Id '{id}' no encontrada.");

            if (await _sedeRepo.ExisteNombreAsync(request.Nombre, id))
                throw new InvalidOperationException($"Ya existe otra sede con el nombre '{request.Nombre}'.");

            sede.NombreSede = request.Nombre.Trim();
            if (request.Ubicacion != null) sede.Ubicacion = request.Ubicacion.Trim();
            if (request.Direccion != null) sede.Direccion = request.Direccion.Trim();

            var updated = await _sedeRepo.ActualizarAsync(sede);
            return MapToDto(updated);
        }

        public async Task<bool> EliminarSoftAsync(int id)
        {
            var sede = await _sedeRepo.ObtenerPorIdAsync(id);
            if (sede == null)
                throw new InvalidOperationException($"Sede con Id '{id}' no encontrada.");
            return await _sedeRepo.EliminarSoftAsync(id);
        }

        public async Task<bool> RestaurarAsync(int id)
        {
            var sede = await _sedeRepo.ObtenerPorIdAsync(id);
            if (sede == null)
                throw new InvalidOperationException($"Sede con Id '{id}' no encontrada.");
            return await _sedeRepo.RestaurarAsync(id);
        }

        // ── Mapeo ──────────────────────────────────────────────────────────────
        private static SedeDto MapToDto(Sede s) => new()
        {
            Id                 = s.Id,
            Nombre             = s.NombreSede,
            Ubicacion          = s.Ubicacion,
            Direccion          = s.Direccion,
            Telefono           = string.Empty,
            Email              = string.Empty,
            Activo             = s.Activo,
            TotalEmpleados     = s.Empleados?.Count(e => e.Activo) ?? 0,
            FechaCreacion      = DateTime.UtcNow,
            FechaActualizacion = null,
        };
    }
}

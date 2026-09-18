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
    public class EmpleadoService : IEmpleadoService
    {
        private readonly IEmpleadoRepository _empleadoRepo;
        private readonly ISedeRepository     _sedeRepo;

        public EmpleadoService(IEmpleadoRepository empleadoRepo, ISedeRepository sedeRepo)
        {
            _empleadoRepo = empleadoRepo;
            _sedeRepo     = sedeRepo;
        }

        public async Task<IEnumerable<EmpleadoDto>> ObtenerTodosAsync(bool incluirInactivos = false)
        {
            var list = await _empleadoRepo.ObtenerTodosAsync(incluirInactivos);
            return list.Select(MapToDto);
        }

        public async Task<EmpleadoDto?> ObtenerPorIdAsync(int id)
        {
            var e = await _empleadoRepo.ObtenerPorIdAsync(id);
            return e == null ? null : MapToDto(e);
        }

        public async Task<EmpleadoDto> CrearAsync(CrearEmpleadoRequest request)
        {
            if (await _empleadoRepo.ExisteDniAsync(request.Dni))
                throw new InvalidOperationException($"El DNI '{request.Dni}' ya está registrado.");

            if (request.SedeId.HasValue)
            {
                var sede = await _sedeRepo.ObtenerPorIdAsync(request.SedeId.Value);
                if (sede == null || !sede.Activo)
                    throw new InvalidOperationException($"La sede con Id '{request.SedeId}' no existe o está inactiva.");
            }

            var empleado = new Empleado
            {
                Nombres      = request.Nombres.Trim(),
                Apellidos    = request.Apellidos.Trim(),
                DNI          = request.Dni.Trim(),
                Cargo        = request.Cargo.Trim(),
                Telefono     = request.Telefono?.Trim(),
                Email        = request.Email?.Trim(),
                FechaIngreso = request.FechaIngreso.HasValue 
                    ? DateTime.SpecifyKind(request.FechaIngreso.Value, DateTimeKind.Utc) 
                    : DateTime.UtcNow,
                SedeId       = request.SedeId,
                Activo       = true,
            };

            var created = await _empleadoRepo.CrearAsync(empleado);
            return MapToDto(created);
        }

        public async Task<EmpleadoDto> ActualizarAsync(int id, ActualizarEmpleadoRequest request)
        {
            var empleado = await _empleadoRepo.ObtenerPorIdAsync(id);
            if (empleado == null)
                throw new InvalidOperationException($"Empleado con Id '{id}' no encontrado.");

            if (await _empleadoRepo.ExisteDniAsync(request.Dni, id))
                throw new InvalidOperationException($"El DNI '{request.Dni}' ya está asignado a otro empleado.");

            if (request.SedeId.HasValue)
            {
                var sede = await _sedeRepo.ObtenerPorIdAsync(request.SedeId.Value);
                if (sede == null || !sede.Activo)
                    throw new InvalidOperationException($"La sede con Id '{request.SedeId}' no existe o está inactiva.");
            }

            empleado.Nombres      = request.Nombres.Trim();
            empleado.Apellidos    = request.Apellidos.Trim();
            empleado.DNI          = request.Dni.Trim();
            empleado.Cargo        = request.Cargo.Trim();
            empleado.Telefono     = request.Telefono?.Trim();
            empleado.Email        = request.Email?.Trim();
            if (request.FechaIngreso.HasValue)
                empleado.FechaIngreso = DateTime.SpecifyKind(request.FechaIngreso.Value, DateTimeKind.Utc);
            empleado.SedeId       = request.SedeId;

            var updated = await _empleadoRepo.ActualizarAsync(empleado);
            return MapToDto(updated);
        }

        public async Task<bool> EliminarSoftAsync(int id)
        {
            var empleado = await _empleadoRepo.ObtenerPorIdAsync(id);
            if (empleado == null)
                throw new InvalidOperationException($"Empleado con Id '{id}' no encontrado.");
            return await _empleadoRepo.EliminarSoftAsync(id);
        }

        public async Task<bool> RestaurarAsync(int id)
        {
            var empleado = await _empleadoRepo.ObtenerPorIdAsync(id);
            if (empleado == null)
                throw new InvalidOperationException($"Empleado con Id '{id}' no encontrado.");
            return await _empleadoRepo.RestaurarAsync(id);
        }

        // ── Mapeo ──────────────────────────────────────────────────────────────
        private static EmpleadoDto MapToDto(Empleado e) => new()
        {
            Id                  = e.Id,
            Nombres             = e.Nombres,
            Apellidos           = e.Apellidos,
            NombreCompleto      = $"{e.Nombres} {e.Apellidos}".Trim(),
            Dni                 = e.DNI,
            Cargo               = e.Cargo,
            Telefono            = e.Telefono,
            Email               = e.Email,
            FechaIngreso        = e.FechaIngreso,
            Activo              = e.Activo,
            FechaCreacion       = e.FechaIngreso,
            FechaActualizacion  = null,
            SedeId              = e.SedeId,
            SedeNombre          = e.Sede?.NombreSede,
            SedeUbicacion       = e.Sede?.Ubicacion,
            UserId              = e.UserId,
            UserEmail           = e.Usuario?.Email,
            UserNombre          = e.Usuario?.UserName,
            RolNombre           = e.Rol?.Name,
        };
    }
}

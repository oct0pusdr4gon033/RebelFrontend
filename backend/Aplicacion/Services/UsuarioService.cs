using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Domain.DTOs.Empresa;
using Domain.Interfaces.Repositories;
using Domain.Interfaces.Services;
using Domain.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Aplicacion.Services
{
    public class UsuarioService : IUsuarioService
    {
        private readonly UserManager<AppUser>  _userManager;
        private readonly RoleManager<Rol>      _roleManager;
        private readonly IEmpleadoRepository   _empleadoRepo;
        private readonly ISedeRepository       _sedeRepo;

        public UsuarioService(
            UserManager<AppUser> userManager,
            RoleManager<Rol> roleManager,
            IEmpleadoRepository empleadoRepo,
            ISedeRepository sedeRepo)
        {
            _userManager  = userManager;
            _roleManager  = roleManager;
            _empleadoRepo = empleadoRepo;
            _sedeRepo     = sedeRepo;
        }

        public async Task<IEnumerable<UsuarioDto>> ObtenerTodosAsync(bool incluirInactivos = false)
        {
            var users = await _userManager.Users.ToListAsync();
            var result = new List<UsuarioDto>();

            foreach (var u in users)
            {
                bool isActivo = !(u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd.Value > DateTimeOffset.UtcNow);
                if (!incluirInactivos && !isActivo)
                    continue;

                var dto = await MapToDtoAsync(u);
                result.Add(dto);
            }
            return result.OrderBy(u => u.NombreCompleto);
        }

        public async Task<UsuarioDto?> ObtenerPorIdAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            return user == null ? null : await MapToDtoAsync(user);
        }

        public async Task<IEnumerable<RolDto>> ObtenerRolesAsync()
        {
            var roles = await _roleManager.Roles.OrderBy(r => r.Name).ToListAsync();
            return roles.Select(r => new RolDto
            {
                Id          = r.Id,
                Nombre      = r.Name ?? string.Empty,
                Descripcion = r.Name,
                Activo      = true,
            });
        }

        public async Task<UsuarioDto> CrearAsync(CrearUsuarioRequest request)
        {
            var rol = await _roleManager.FindByIdAsync(request.RolId);
            if (rol == null)
                throw new InvalidOperationException($"El rol con Id '{request.RolId}' no existe.");

            var existing = await _userManager.FindByEmailAsync(request.Email);
            if (existing != null)
                throw new InvalidOperationException($"El email '{request.Email}' ya está registrado.");

            var user = new AppUser
            {
                UserName       = request.Email,
                Email          = request.Email,
                EmailConfirmed = true,
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Error al crear usuario: {errors}");
            }

            await _userManager.AddToRoleAsync(user, rol.Name!);

            // Si se especificó empleado existente, vincularlo y asignarle rol y sede
            if (request.EmpleadoId.HasValue)
            {
                var empleado = await _empleadoRepo.ObtenerPorIdAsync(request.EmpleadoId.Value);
                if (empleado != null)
                {
                    empleado.UserId = user.Id;
                    empleado.RolId = rol.Id;
                    if (request.SedeId.HasValue) empleado.SedeId = request.SedeId.Value;
                    await _empleadoRepo.ActualizarAsync(empleado);
                }
            }
            else
            {
                // Si no se vinculó a empleado existente, creamos el perfil Empleado asociado
                var partesNombre = request.NombreCompleto.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var nombres = partesNombre.Length > 0 ? partesNombre[0] : request.Email;
                var apellidos = partesNombre.Length > 1 ? partesNombre[1] : "-";

                var nuevoEmpleado = new Empleado
                {
                    Nombres      = nombres,
                    Apellidos    = apellidos,
                    DNI          = "USR-" + user.Id[..Math.Min(10, user.Id.Length)],
                    Cargo        = rol.Name ?? "Usuario",
                    Email        = request.Email,
                    FechaIngreso = DateTime.UtcNow,
                    Activo       = true,
                    RolId        = rol.Id,
                    UserId       = user.Id,
                    SedeId       = request.SedeId,
                };
                await _empleadoRepo.CrearAsync(nuevoEmpleado);
            }

            return await MapToDtoAsync(user);
        }

        public async Task<UsuarioDto> ActualizarAsync(string id, ActualizarUsuarioRequest request)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                throw new InvalidOperationException($"Usuario con Id '{id}' no encontrado.");

            if (!request.Activo)
            {
                await _userManager.SetLockoutEnabledAsync(user, true);
                await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
            }
            else
            {
                await _userManager.SetLockoutEndDateAsync(user, null);
            }

            await _userManager.UpdateAsync(user);

            // Cambiar rol si se especificó
            Rol? nuevoRol = null;
            if (!string.IsNullOrWhiteSpace(request.RolId))
            {
                nuevoRol = await _roleManager.FindByIdAsync(request.RolId);
                if (nuevoRol == null)
                    throw new InvalidOperationException($"El rol con Id '{request.RolId}' no existe.");

                var rolesActuales = await _userManager.GetRolesAsync(user);
                await _userManager.RemoveFromRolesAsync(user, rolesActuales);
                await _userManager.AddToRoleAsync(user, nuevoRol.Name!);
            }

            // Actualizar empleado asociado
            var empleadoActual = await _empleadoRepo.ObtenerPorUserIdAsync(id);
            if (request.EmpleadoId.HasValue)
            {
                if (empleadoActual != null && empleadoActual.Id != request.EmpleadoId.Value)
                {
                    empleadoActual.UserId = null;
                    await _empleadoRepo.ActualizarAsync(empleadoActual);
                }

                var nuevo = await _empleadoRepo.ObtenerPorIdAsync(request.EmpleadoId.Value);
                if (nuevo != null)
                {
                    nuevo.UserId = user.Id;
                    if (nuevoRol != null) nuevo.RolId = nuevoRol.Id;
                    if (request.SedeId.HasValue) nuevo.SedeId = request.SedeId.Value;
                    await _empleadoRepo.ActualizarAsync(nuevo);
                }
            }
            else if (empleadoActual != null)
            {
                if (nuevoRol != null) empleadoActual.RolId = nuevoRol.Id;
                if (request.SedeId.HasValue) empleadoActual.SedeId = request.SedeId.Value;
                await _empleadoRepo.ActualizarAsync(empleadoActual);
            }

            return await MapToDtoAsync(user);
        }

        public async Task<bool> EliminarSoftAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return false;
            await _userManager.SetLockoutEnabledAsync(user, true);
            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
            await _userManager.UpdateAsync(user);
            return true;
        }

        public async Task<bool> RestaurarAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return false;
            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.UpdateAsync(user);
            return true;
        }

        // ── Mapeo ──────────────────────────────────────────────────────────────
        private async Task<UsuarioDto> MapToDtoAsync(AppUser u)
        {
            var roles   = await _userManager.GetRolesAsync(u);
            var rolName = roles.FirstOrDefault();
            Rol? rol = rolName != null ? await _roleManager.FindByNameAsync(rolName) : null;

            var empleado = await _empleadoRepo.ObtenerPorUserIdAsync(u.Id);
            bool isActivo = !(u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd.Value > DateTimeOffset.UtcNow);

            string nombre = empleado != null 
                ? $"{empleado.Nombres} {empleado.Apellidos}".Trim() 
                : (u.UserName ?? u.Email ?? "Usuario");

            return new UsuarioDto
            {
                Id                      = u.Id,
                Email                   = u.Email ?? string.Empty,
                UserName                = u.UserName ?? string.Empty,
                NombreCompleto          = nombre,
                Activo                  = isActivo,
                FechaCreacion           = DateTime.UtcNow,
                RolId                   = rol?.Id,
                RolNombre               = rolName,
                EmpleadoId              = empleado?.Id,
                EmpleadoNombreCompleto  = empleado != null ? $"{empleado.Nombres} {empleado.Apellidos}".Trim() : null,
                EmpleadoDni             = empleado?.DNI,
                SedeId                  = empleado?.SedeId,
                SedeNombre              = empleado?.Sede?.NombreSede,
            };
        }
    }
}

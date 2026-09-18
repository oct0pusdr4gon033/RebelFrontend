using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.DTOs.Empresa;

namespace Domain.Interfaces.Services
{
    public interface IUsuarioService
    {
        Task<IEnumerable<UsuarioDto>> ObtenerTodosAsync(bool incluirInactivos = false);
        Task<UsuarioDto?> ObtenerPorIdAsync(string id);
        Task<IEnumerable<RolDto>> ObtenerRolesAsync();
        Task<UsuarioDto> CrearAsync(CrearUsuarioRequest request);
        Task<UsuarioDto> ActualizarAsync(string id, ActualizarUsuarioRequest request);
        Task<bool> EliminarSoftAsync(string id);
        Task<bool> RestaurarAsync(string id);
    }
}

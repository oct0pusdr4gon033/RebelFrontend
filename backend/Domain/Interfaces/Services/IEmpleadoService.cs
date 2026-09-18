using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.DTOs.Empresa;

namespace Domain.Interfaces.Services
{
    public interface IEmpleadoService
    {
        Task<IEnumerable<EmpleadoDto>> ObtenerTodosAsync(bool incluirInactivos = false);
        Task<EmpleadoDto?> ObtenerPorIdAsync(int id);
        Task<EmpleadoDto> CrearAsync(CrearEmpleadoRequest request);
        Task<EmpleadoDto> ActualizarAsync(int id, ActualizarEmpleadoRequest request);
        Task<bool> EliminarSoftAsync(int id);
        Task<bool> RestaurarAsync(int id);
    }
}

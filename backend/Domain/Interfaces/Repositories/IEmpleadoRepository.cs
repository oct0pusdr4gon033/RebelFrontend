using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IEmpleadoRepository
    {
        Task<IEnumerable<Empleado>> ObtenerTodosAsync(bool incluirInactivos = false);
        Task<Empleado?> ObtenerPorIdAsync(int id);
        Task<Empleado?> ObtenerPorDniAsync(string dni);
        Task<Empleado?> ObtenerPorUserIdAsync(string userId);
        Task<IEnumerable<Empleado>> ObtenerPorSedeAsync(int sedeId);
        Task<Empleado> CrearAsync(Empleado empleado);
        Task<Empleado> ActualizarAsync(Empleado empleado);
        Task<bool> EliminarSoftAsync(int id);
        Task<bool> RestaurarAsync(int id);
        Task<bool> EliminarAsync(int id);
        Task<bool> ExisteDniAsync(string dni, int? excludeId = null);
    }
}

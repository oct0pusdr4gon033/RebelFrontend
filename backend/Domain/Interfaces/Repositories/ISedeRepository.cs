using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface ISedeRepository
    {
        Task<IEnumerable<Sede>> ObtenerTodasAsync(bool incluirInactivas = false);
        Task<Sede?> ObtenerPorIdAsync(int id);
        Task<Sede> CrearAsync(Sede sede);
        Task<Sede> ActualizarAsync(Sede sede);
        Task<bool> EliminarSoftAsync(int id);
        Task<bool> RestaurarAsync(int id);
        Task<bool> ExisteNombreAsync(string nombre, int? excludeId = null);
    }
}

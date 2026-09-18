using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IOportunidadRepository
    {
        Task<IEnumerable<Oportunidad>> ObtenerTodasAsync();
        Task<Oportunidad?> ObtenerPorIdAsync(int id);
        Task<Oportunidad> CrearAsync(Oportunidad oportunidad);
        Task<Oportunidad> ActualizarAsync(Oportunidad oportunidad);
        Task<bool> EliminarAsync(int id);
        Task<bool> ExisteRequerimientoAsync(string numeroRequerimiento);
    }
}

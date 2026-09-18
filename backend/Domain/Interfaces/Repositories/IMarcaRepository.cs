using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IMarcaRepository
    {
        Task<IEnumerable<Marca>> ObtenerTodasAsync();
        Task<Marca?> ObtenerPorIdAsync(int id);
        Task<Marca> CrearAsync(Marca marca);
    }
}

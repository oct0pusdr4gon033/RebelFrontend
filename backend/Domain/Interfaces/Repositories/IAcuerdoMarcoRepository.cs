using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IAcuerdoMarcoRepository
    {
        Task<IEnumerable<AcuerdoMarco>> ObtenerTodosAsync();
        Task<AcuerdoMarco?> ObtenerPorIdAsync(int id);
        Task<AcuerdoMarco?> ObtenerPorCodigoAsync(string codigo);
    }
}

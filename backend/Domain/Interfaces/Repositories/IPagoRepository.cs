using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IPagoRepository
    {
        Task<IEnumerable<PagoOC>> ObtenerTodosAsync();
        Task<PagoOC?> ObtenerPorIdAsync(int id);
        Task<IEnumerable<PagoOC>> ObtenerPorOCAsync(string numeroOC);
        Task<IEnumerable<PagoOC>> ObtenerPorOportunidadIdAsync(int oportunidadId);
        Task<string> GenerarSiguienteCodigoAsync();
        Task<PagoOC> CrearAsync(PagoOC pago);
        Task<bool> EliminarAsync(int id);
    }
}

using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.DTOs.Empresa;

namespace Domain.Interfaces.Services
{
    public interface ISedeService
    {
        Task<IEnumerable<SedeDto>> ObtenerTodasAsync(bool incluirInactivas = false);
        Task<SedeDto?> ObtenerPorIdAsync(int id);
        Task<SedeDto> CrearAsync(CrearSedeRequest request);
        Task<SedeDto> ActualizarAsync(int id, ActualizarSedeRequest request);
        Task<bool> EliminarSoftAsync(int id);
        Task<bool> RestaurarAsync(int id);
    }
}

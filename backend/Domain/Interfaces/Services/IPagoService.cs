using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.DTOs.Pagos;

namespace Domain.Interfaces.Services
{
    public interface IPagoService
    {
        Task<IEnumerable<PagoResponseDto>> ObtenerTodosAsync();
        Task<PagoResponseDto?> ObtenerPorIdAsync(int id);
        Task<IEnumerable<PagoResponseDto>> ObtenerPorOCAsync(string numeroOC);
        Task<PagoResponseDto> RegistrarPagoAsync(RegistrarPagoDto dto, string? usuarioId = null);
        Task<bool> EliminarPagoAsync(int id);
        Task<LiquidacionOCResponseDto> ObtenerLiquidacionPorOCAsync(string numeroOC);
    }
}

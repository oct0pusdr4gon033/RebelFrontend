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
        Task<LiquidacionOCResponseDto> ObtenerLiquidacionPorOCAsync(string numeroOC);
        Task<PagoResponseDto> RegistrarPagoAsync(RegistrarPagoDto dto, string? usuarioId = null);
        Task<PagoResponseDto> ResolverPagoAdminAsync(int id, ResolverPagoAdminDto dto);
        Task<PagoResponseDto> CorregirPagoAsync(int id, CorregirPagoDto dto);
        Task<bool> EliminarPagoAsync(int id);
    }
}

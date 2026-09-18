using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.DTOs.Oportunidad;

namespace Domain.Interfaces.Services
{
    public interface IOportunidadService
    {
        Task<IEnumerable<OportunidadResponseDto>> ObtenerTodasAsync();
        Task<OportunidadResponseDto?> ObtenerPorIdAsync(int id);
        Task<OportunidadResponseDto> CrearAsync(CrearOportunidadDto dto, string? usuarioId = null);
        
        // REGLA DE NEGOCIO: Actualiza Empresa, Marcas y Productos. Convocatoria Perú Compras NO se edita.
        Task<OportunidadResponseDto> ActualizarAsync(int id, ActualizarOportunidadDto dto);

        // Métodos de edición complementarios
        Task<OportunidadResponseDto> ActualizarMarcasAsync(int id, List<int> marcaIds);
        Task<OportunidadResponseDto> ActualizarProductosAsync(int id, List<ProductoItemDto> productos);
        Task<OportunidadResponseDto> AgregarMarcaAsync(int id, int marcaId);
        Task<OportunidadResponseDto> EliminarMarcaAsync(int id, int marcaId);
        Task<OportunidadResponseDto> AgregarProductoAsync(int id, ProductoItemDto producto);
        Task<OportunidadResponseDto> EliminarProductoAsync(int id, int productoId);

        Task<bool> EliminarAsync(int id);
    }
}

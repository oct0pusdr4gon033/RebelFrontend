using System.Collections.Generic;
using System.IO;
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

        // Cambio de estado (solo el creador puede cambiar)
        Task<OportunidadResponseDto> CambiarEstadoAsync(int id, CambiarEstadoDto dto, string usuarioId, bool esAdmin = false);

        // ── BLOQUE 2: ÓRDENES DE COMPRA Y OPERACIONES ──
        Task<OportunidadResponseDto> RegistrarOrdenCompraAsync(int id, RegistrarOrdenCompraDto dto, string usuarioId);
        Task<OportunidadResponseDto> CambiarEstadoOCAsync(int id, CambiarEstadoOCDto dto, string usuarioId);
        Task<OportunidadResponseDto> RenegociarCostoAsync(int id, RenegociarCostoDto dto, string usuarioId);
        Task<OportunidadResponseDto> RegistrarEntregaAsync(int id, RegistrarEntregaDto dto, string usuarioId);

        // ── STORAGE DE IMÁGENES / EVIDENCIAS (1 Oportunidad - 1,N Imágenes en BD) ──
        Task<IEnumerable<OportunidadImagenDto>> ObtenerImagenesAsync(int oportunidadId);
        Task<(byte[] datos, string contentType, string nombreArchivo)?> ObtenerArchivoImagenAsync(int imagenId);
        Task<OportunidadImagenDto> SubirImagenAsync(int oportunidadId, Stream archivoStream, string nombreArchivo, string contentType, SubirOportunidadImagenDto dto, string? usuarioId, string? usuarioNombre);
        Task<bool> EliminarImagenAsync(int oportunidadId, int imagenId, string? usuarioId, bool esAdmin = false);

        Task<bool> EliminarAsync(int id);
    }
}

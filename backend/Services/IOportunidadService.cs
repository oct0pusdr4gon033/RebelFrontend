using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RebelQueenBack.Application.Dtos;

namespace RebelQueenBack.Application.Services
{
    public interface IOportunidadService
    {
        Task<IEnumerable<OportunidadResponseDto>> ObtenerTodasAsync();
        Task<OportunidadResponseDto?> ObtenerPorIdAsync(Guid id);
        Task<OportunidadResponseDto> CrearAsync(CrearOportunidadDto dto, string? usuarioId = null);
        
        /// <summary>
        /// Actualiza EXCLUSIVAMENTE marcas y productos/límites.
        /// Los datos de la convocatoria Perú Compras permanecen inmutables.
        /// </summary>
        Task<OportunidadResponseDto> ActualizarAsync(Guid id, ActualizarOportunidadDto dto);

        Task<bool> EliminarAsync(Guid id);
    }
}

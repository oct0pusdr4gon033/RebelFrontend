using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.DTOs.Contactos;

namespace Domain.Interfaces.Services
{
    public interface IContactoService
    {
        Task<IEnumerable<ContactoOCAMResponseDto>> ObtenerTodosAsync(FiltroContactoOCAMDto? filtro = null);
        Task<ContactoOCAMResponseDto?> ObtenerPorIdAsync(int id);
        Task<ContactoOCAMResponseDto> CrearAsync(CrearContactoOCAMDto dto, string usuarioId, string nombreUsuario);
        Task<IEnumerable<ContactoOCAMResponseDto>> CrearLoteAsync(CrearContactoOCAMDto dto, string usuarioId, string nombreUsuario);
    }
}

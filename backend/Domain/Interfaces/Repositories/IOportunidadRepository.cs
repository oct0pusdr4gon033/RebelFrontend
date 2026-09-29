using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IOportunidadRepository
    {
        Task<IEnumerable<Oportunidad>> ObtenerTodasAsync();
        Task<Oportunidad?> ObtenerPorIdAsync(int id);
        Task<Oportunidad?> ObtenerPorRequerimientoAsync(string numeroRequerimiento);
        Task<Oportunidad> CrearAsync(Oportunidad oportunidad);
        Task<Oportunidad> ActualizarAsync(Oportunidad oportunidad);
        Task<bool> EliminarAsync(int id);
        Task<bool> ExisteRequerimientoAsync(string numeroRequerimiento);
        Task<bool> ExisteParaUsuarioAsync(string numeroRequerimiento, string usuarioId);
        Task<bool> ExisteBuenaProAsync(string numeroRequerimiento, int? excluirId = null);

        // ── Storage de Imágenes de Evidencias (PostgreSQL BYTEA) ──
        Task<IEnumerable<OportunidadImagen>> ObtenerImagenesAsync(int oportunidadId);
        Task<OportunidadImagen?> ObtenerImagenPorIdAsync(int imagenId);
        Task<OportunidadImagen> AgregarImagenAsync(OportunidadImagen imagen);
        Task<bool> EliminarImagenAsync(int imagenId);
    }
}

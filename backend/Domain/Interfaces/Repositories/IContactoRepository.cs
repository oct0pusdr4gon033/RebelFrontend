using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IContactoRepository
    {
        Task<IEnumerable<ContactoOCAM>> ObtenerTodosAsync(
            string? numeroOcam = null,
            string? empresaRelacionada = null,
            string? tipoRelacion = null,
            string? busqueda = null,
            string? rucEntidad = null);

        Task<ContactoOCAM?> ObtenerPorIdAsync(int id);
        Task<ContactoOCAM> CrearAsync(ContactoOCAM contacto);
        Task<IEnumerable<ContactoOCAM>> CrearVariosAsync(IEnumerable<ContactoOCAM> contactos);
    }
}

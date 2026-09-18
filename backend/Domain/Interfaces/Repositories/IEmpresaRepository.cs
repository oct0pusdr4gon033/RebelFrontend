using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Interfaces.Repositories
{
    public interface IEmpresaRepository
    {
        Task<IEnumerable<Empresa>> ObtenerTodasAsync();
        Task<(IEnumerable<Empresa> items, int total)> ObtenerPaginadoAsync(string? busqueda, int pagina, int tamanoPagina);
        Task<Empresa?> ObtenerPorIdAsync(int id);
        Task<Empresa?> ObtenerPorRucAsync(string ruc);
        Task<Empresa> CrearAsync(Empresa empresa);
    }
}

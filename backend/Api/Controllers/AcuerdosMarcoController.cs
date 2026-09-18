using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    public class AcuerdoMarcoDto
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string Descipcion { get; set; } = string.Empty;
        public bool Activo { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AcuerdosMarcoController : ControllerBase
    {
        private readonly IAcuerdoMarcoRepository _acuerdoMarcoRepository;

        public AcuerdosMarcoController(IAcuerdoMarcoRepository acuerdoMarcoRepository)
        {
            _acuerdoMarcoRepository = acuerdoMarcoRepository;
        }

        /// <summary>
        /// Obtiene todos los acuerdos marco registrados en la base de datos
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<AcuerdoMarcoDto>>> GetAll()
        {
            var acuerdos = await _acuerdoMarcoRepository.ObtenerTodosAsync();
            var dtos = acuerdos.Select(a => new AcuerdoMarcoDto
            {
                Id = a.Id,
                Codigo = a.Codigo ?? string.Empty,
                Descripcion = a.Descipcion ?? string.Empty,
                Descipcion = a.Descipcion ?? string.Empty,
                Activo = a.Activo
            });

            return Ok(dtos);
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<ActionResult<AcuerdoMarcoDto>> GetById(int id)
        {
            var a = await _acuerdoMarcoRepository.ObtenerPorIdAsync(id);
            if (a == null)
                return NotFound(new { mensaje = $"Acuerdo marco con Id '{id}' no encontrado." });

            return Ok(new AcuerdoMarcoDto
            {
                Id = a.Id,
                Codigo = a.Codigo ?? string.Empty,
                Descripcion = a.Descipcion ?? string.Empty,
                Descipcion = a.Descipcion ?? string.Empty,
                Activo = a.Activo
            });
        }
    }
}

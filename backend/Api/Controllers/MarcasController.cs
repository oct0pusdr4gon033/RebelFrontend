using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Interfaces.Repositories;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MarcasController : ControllerBase
    {
        private readonly IMarcaRepository _marcaRepository;

        public MarcasController(IMarcaRepository marcaRepository)
        {
            _marcaRepository = marcaRepository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marca>>> GetAll()
        {
            var marcas = await _marcaRepository.ObtenerTodasAsync();
            return Ok(marcas);
        }

        [HttpPost]
        public async Task<ActionResult<Marca>> Create([FromBody] Marca marca)
        {
            if (string.IsNullOrWhiteSpace(marca.Nombre))
                return BadRequest(new { mensaje = "El nombre de la marca es obligatorio." });

            var nueva = await _marcaRepository.CrearAsync(marca);
            return CreatedAtAction(nameof(GetAll), new { id = nueva.Id }, nueva);
        }
    }
}

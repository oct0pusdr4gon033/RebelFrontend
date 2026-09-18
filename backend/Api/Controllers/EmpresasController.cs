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
    public class EmpresasController : ControllerBase
    {
        private readonly IEmpresaRepository _empresaRepository;

        public EmpresasController(IEmpresaRepository empresaRepository)
        {
            _empresaRepository = empresaRepository;
        }

        [HttpGet]
        public async Task<ActionResult> Get([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int limit = 10)
        {
            var (items, total) = await _empresaRepository.ObtenerPaginadoAsync(q, page, limit);
            return Ok(new Dtos.PaginatedResult<Empresa>
            {
                Items = items,
                TotalCount = total
            });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Empresa>> GetById(int id)
        {
            var empresa = await _empresaRepository.ObtenerPorIdAsync(id);
            if (empresa == null)
                return NotFound(new { mensaje = $"Empresa con Id '{id}' no encontrada." });

            return Ok(empresa);
        }

        [HttpPost]
        public async Task<ActionResult<Empresa>> Create([FromBody] Empresa empresa)
        {
            if (string.IsNullOrWhiteSpace(empresa.RazonSocial))
                return BadRequest(new { mensaje = "La Razón Social es obligatoria." });

            var nueva = await _empresaRepository.CrearAsync(empresa);
            return CreatedAtAction(nameof(GetById), new { id = nueva.Id }, nueva);
        }
    }
}

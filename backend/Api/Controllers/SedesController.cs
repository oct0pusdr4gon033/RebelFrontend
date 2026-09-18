using System;
using System.Threading.Tasks;
using Domain.DTOs.Empresa;
using Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SedesController : ControllerBase
    {
        private readonly ISedeService _sedeService;

        public SedesController(ISedeService sedeService)
        {
            _sedeService = sedeService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool incluirInactivas = false)
        {
            var sedes = await _sedeService.ObtenerTodasAsync(incluirInactivas);
            return Ok(sedes);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var sede = await _sedeService.ObtenerPorIdAsync(id);
            if (sede == null)
                return NotFound(new { mensaje = $"Sede con Id '{id}' no encontrada." });
            return Ok(sede);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CrearSedeRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _sedeService.CrearAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { mensaje = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] ActualizarSedeRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var updated = await _sedeService.ActualizarAsync(id, request);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { mensaje = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            try
            {
                var ok = await _sedeService.EliminarSoftAsync(id);
                return ok ? NoContent() : NotFound(new { mensaje = $"Sede con Id '{id}' no encontrada." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
        }

        [HttpPatch("{id:int}/restaurar")]
        public async Task<IActionResult> Restaurar(int id)
        {
            try
            {
                var ok = await _sedeService.RestaurarAsync(id);
                return ok ? NoContent() : NotFound(new { mensaje = $"Sede con Id '{id}' no encontrada." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
        }
    }
}

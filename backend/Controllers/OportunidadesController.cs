using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RebelQueenBack.Application.Dtos;
using RebelQueenBack.Application.Services;

namespace RebelQueenBack.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requiere autenticación JWT
    public class OportunidadesController : ControllerBase
    {
        private readonly IOportunidadService _oportunidadService;

        public OportunidadesController(IOportunidadService oportunidadService)
        {
            _oportunidadService = oportunidadService;
        }

        /// <summary>
        /// Obtiene todas las oportunidades registradas en el sistema
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OportunidadResponseDto>>> GetAll()
        {
            var result = await _oportunidadService.ObtenerTodasAsync();
            return Ok(result);
        }

        /// <summary>
        /// Obtiene el detalle de una oportunidad por su Id
        /// </summary>
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<OportunidadResponseDto>> GetById(Guid id)
        {
            var op = await _oportunidadService.ObtenerPorIdAsync(id);
            if (op == null)
                return NotFound(new { mensaje = $"Oportunidad con Id '{id}' no encontrada." });

            return Ok(op);
        }

        /// <summary>
        /// Registra una nueva oportunidad de licitación en Perú Compras
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<OportunidadResponseDto>> Create([FromBody] CrearOportunidadDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var creada = await _oportunidadService.CrearAsync(dto, userId);

            return CreatedAtAction(nameof(GetById), new { id = creada.Id }, creada);
        }

        /// <summary>
        /// Actualiza EXCLUSIVAMENTE las Marcas y los Productos/Límites de la Oportunidad.
        /// Los datos de la Convocatoria Perú Compras (Requerimiento, Acuerdo Marco y Fecha de Vencimiento) NO se modifican.
        /// </summary>
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<OportunidadResponseDto>> Update(Guid id, [FromBody] ActualizarOportunidadDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var actualizada = await _oportunidadService.ActualizarAsync(id, dto);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Ocurrió un error al actualizar la oportunidad.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// Elimina una oportunidad por su Id
        /// </summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var eliminado = await _oportunidadService.EliminarAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"Oportunidad con Id '{id}' no encontrada." });

            return NoContent();
        }
    }
}

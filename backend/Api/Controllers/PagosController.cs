using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Domain.DTOs.Pagos;
using Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PagosController : ControllerBase
    {
        private readonly IPagoService _pagoService;

        public PagosController(IPagoService pagoService)
        {
            _pagoService = pagoService;
        }

        /// <summary>
        /// Obtiene el historial completo de pagos y peticiones registradas
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<PagoResponseDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<PagoResponseDto>>> ObtenerTodos()
        {
            var pagos = await _pagoService.ObtenerTodosAsync();
            return Ok(pagos);
        }

        /// <summary>
        /// Obtiene el detalle de un pago por su ID
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PagoResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<PagoResponseDto>> ObtenerPorId(int id)
        {
            var pago = await _pagoService.ObtenerPorIdAsync(id);
            if (pago == null)
            {
                return NotFound(new { mensaje = $"No se encontró el pago con ID #{id}." });
            }
            return Ok(pago);
        }

        /// <summary>
        /// Obtiene los pagos registrados asociados a una Orden de Compra o Requerimiento
        /// </summary>
        [HttpGet("oc/{numeroOC}")]
        [ProducesResponseType(typeof(IEnumerable<PagoResponseDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<PagoResponseDto>>> ObtenerPorOC(string numeroOC)
        {
            var pagos = await _pagoService.ObtenerPorOCAsync(numeroOC);
            return Ok(pagos);
        }

        /// <summary>
        /// Obtiene el balance financiero y liquidación acumulada de una Orden de Compra
        /// </summary>
        [HttpGet("liquidacion/oc/{numeroOC}")]
        [ProducesResponseType(typeof(LiquidacionOCResponseDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<LiquidacionOCResponseDto>> ObtenerLiquidacionPorOC(string numeroOC)
        {
            var liquidacion = await _pagoService.ObtenerLiquidacionPorOCAsync(numeroOC);
            return Ok(liquidacion);
        }

        /// <summary>
        /// Registra una nueva petición de pago (proveedor, transporte, producto individual u otro)
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(PagoResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<PagoResponseDto>> RegistrarPago([FromBody] RegistrarPagoDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var nuevo = await _pagoService.RegistrarPagoAsync(dto, usuarioId);
                return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, nuevo);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { mensaje = "Error interno al procesar el pago: " + ex.Message });
            }
        }

        /// <summary>
        /// Elimina un pago por su ID
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Eliminar(int id)
        {
            var eliminado = await _pagoService.EliminarPagoAsync(id);
            if (!eliminado)
            {
                return NotFound(new { mensaje = $"No se encontró el pago con ID #{id} para eliminar." });
            }
            return NoContent();
        }
    }
}

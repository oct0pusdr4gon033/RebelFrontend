using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Domain.DTOs.Oportunidad;
using Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
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
        [ProducesResponseType(typeof(IEnumerable<OportunidadResponseDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<OportunidadResponseDto>>> GetAll()
        {
            var result = await _oportunidadService.ObtenerTodasAsync();
            return Ok(result);
        }

        /// <summary>
        /// Obtiene el detalle de una oportunidad por su ID
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> GetById(int id)
        {
            var op = await _oportunidadService.ObtenerPorIdAsync(id);
            if (op == null)
                return NotFound(new { mensaje = $"Oportunidad con ID '{id}' no encontrada." });

            return Ok(op);
        }

        /// <summary>
        /// REGISTRO RÁPIDO EXPRÉS: Registra de inmediato la oportunidad para ganar la cotización.
        /// La Empresa / Entidad es opcional para no demorar a la ejecutiva.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<OportunidadResponseDto>> Create([FromBody] CrearOportunidadDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var creada = await _oportunidadService.CrearAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = creada.Id }, creada);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al registrar la oportunidad.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// ACTUALIZACIÓN CON REGLA DE NEGOCIO ESTRICTA:
        /// 1. Datos de Convocatoria Perú Compras (Requerimiento, Acuerdo Marco, Fecha Vencimiento) -> NO SE EDITAN.
        /// 2. Empresa / Entidad Solicitante -> SE EDITA (se puede vincular o editar tras el registro rápido).
        /// 3. Marcas y Productos/Límites del Requerimiento -> SE EDITAN.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> Update(int id, [FromBody] ActualizarOportunidadDto dto)
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al actualizar la oportunidad.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// Actualiza exclusivamente las marcas de la oportunidad
        /// </summary>
        [HttpPut("{id:int}/marcas")]
        public async Task<ActionResult<OportunidadResponseDto>> UpdateMarcas(int id, [FromBody] List<int> marcaIds)
        {
            try
            {
                var actualizada = await _oportunidadService.ActualizarMarcasAsync(id, marcaIds);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Actualiza exclusivamente los productos y límites del requerimiento
        /// </summary>
        [HttpPut("{id:int}/productos")]
        public async Task<ActionResult<OportunidadResponseDto>> UpdateProductos(int id, [FromBody] List<ProductoItemDto> productos)
        {
            try
            {
                var actualizada = await _oportunidadService.ActualizarProductosAsync(id, productos);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Agrega una marca a la oportunidad
        /// </summary>
        [HttpPost("{id:int}/marcas/{marcaId:int}")]
        public async Task<ActionResult<OportunidadResponseDto>> AddMarca(int id, int marcaId)
        {
            try
            {
                var actualizada = await _oportunidadService.AgregarMarcaAsync(id, marcaId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Elimina una marca de la oportunidad
        /// </summary>
        [HttpDelete("{id:int}/marcas/{marcaId:int}")]
        public async Task<ActionResult<OportunidadResponseDto>> RemoveMarca(int id, int marcaId)
        {
            try
            {
                var actualizada = await _oportunidadService.EliminarMarcaAsync(id, marcaId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Agrega un nuevo producto con su límite a la oportunidad
        /// </summary>
        [HttpPost("{id:int}/productos")]
        public async Task<ActionResult<OportunidadResponseDto>> AddProducto(int id, [FromBody] ProductoItemDto producto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var actualizada = await _oportunidadService.AgregarProductoAsync(id, producto);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Elimina un producto de la oportunidad
        /// </summary>
        [HttpDelete("{id:int}/productos/{productoId:int}")]
        public async Task<ActionResult<OportunidadResponseDto>> RemoveProducto(int id, int productoId)
        {
            try
            {
                var actualizada = await _oportunidadService.EliminarProductoAsync(id, productoId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Elimina una oportunidad por su ID
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var eliminado = await _oportunidadService.EliminarAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"Oportunidad con ID '{id}' no encontrada." });

            return NoContent();
        }
    }
}

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
        /// CAMBIO DE ESTADO: Solo la ejecutiva que registró la oportunidad puede cambiar su estado.
        /// Transiciones permitidas: En Licitación → Cotizada/Desestimada, Cotizada → Adjudicada/Desestimada
        /// </summary>
        [HttpPatch("{id:int}/estado")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> CambiarEstado(int id, [FromBody] CambiarEstadoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { mensaje = "Usuario no autenticado." });

                var esAdmin = User.IsInRole("Administrador") || User.IsInRole("SysAdmin") || User.IsInRole("Admin") || User.Claims.Any(c => (c.Type == ClaimTypes.Role || c.Type == "role") && (c.Value == "Administrador" || c.Value == "SysAdmin" || c.Value == "Admin"));
                var actualizada = await _oportunidadService.CambiarEstadoAsync(id, dto, userId, esAdmin);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { mensaje = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al cambiar el estado.", detalle = ex.Message });
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

        // ══════════════════════════════════════════════════════════════════════
        // BLOQUE 2: ÓRDENES DE COMPRA Y OPERACIONES (OC & Logística)
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// BLOQUE 2 – Hito 1: Registra la OC emitida por la entidad tras la adjudicación.
        /// Transición: Adjudicada → OC_RECIBIDA. Solo la ejecutiva propietaria.
        /// </summary>
        [HttpPost("{id:int}/oc")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> RegistrarOC(int id, [FromBody] RegistrarOrdenCompraDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { mensaje = "Usuario no autenticado." });

                var actualizada = await _oportunidadService.RegistrarOrdenCompraAsync(id, dto, userId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { mensaje = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al registrar la Orden de Compra.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// BLOQUE 2 – Hito 2: Acepta o rechaza la OC (7.º día hábil).
        /// Transición: OC_RECIBIDA → OC_ACEPTADA | OC_RECHAZADA.
        /// </summary>
        [HttpPatch("{id:int}/oc/estado")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> CambiarEstadoOC(int id, [FromBody] CambiarEstadoOCDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { mensaje = "Usuario no autenticado." });

                var actualizada = await _oportunidadService.CambiarEstadoOCAsync(id, dto, userId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { mensaje = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al actualizar la Orden de Compra.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// BLOQUE 2 – Hito 3: Renegociación de rentabilidad y fletes (8.º día hábil).
        /// Solo sobre OC_ACEPTADA.
        /// </summary>
        [HttpPut("{id:int}/oc/costo")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> RenegociarCosto(int id, [FromBody] RenegociarCostoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { mensaje = "Usuario no autenticado." });

                var actualizada = await _oportunidadService.RenegociarCostoAsync(id, dto, userId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { mensaje = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al renegociar el costo.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// BLOQUE 2 – Hito 4: Despacho y entrega según plazos de la OC.
        /// Transición: OC_ACEPTADA → ENTREGADA.
        /// </summary>
        [HttpPost("{id:int}/entregas")]
        [ProducesResponseType(typeof(OportunidadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OportunidadResponseDto>> RegistrarEntrega(int id, [FromBody] RegistrarEntregaDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { mensaje = "Usuario no autenticado." });

                var actualizada = await _oportunidadService.RegistrarEntregaAsync(id, dto, userId);
                return Ok(actualizada);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { mensaje = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al registrar la entrega.", detalle = ex.Message });
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // BLOQUE 3: STORAGE EN BD DE EVIDENCIAS / IMÁGENES (1 Oportunidad - 1,N Imágenes)
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Obtiene todas las evidencias fotográficas / imágenes de una oportunidad
        /// </summary>
        [HttpGet("{id:int}/imagenes")]
        [ProducesResponseType(typeof(IEnumerable<OportunidadImagenDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<OportunidadImagenDto>>> GetImagenes(int id)
        {
            try
            {
                var list = await _oportunidadService.ObtenerImagenesAsync(id);
                return Ok(list);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Descarga o visualiza directamente el archivo de imagen almacenado en PostgreSQL BYTEA
        /// </summary>
        [HttpGet("{id:int}/imagenes/{imagenId:int}/archivo")]
        [AllowAnonymous] // Permite miniaturas directas en etiquetas <img> del frontend
        public async Task<IActionResult> GetArchivoImagen(int id, int imagenId)
        {
            var res = await _oportunidadService.ObtenerArchivoImagenAsync(imagenId);
            if (res == null)
                return NotFound(new { mensaje = "Imagen de evidencia no encontrada." });

            return File(res.Value.datos, res.Value.contentType, res.Value.nombreArchivo);
        }

        /// <summary>
        /// Sube y almacena una evidencia fotográfica en la BD.
        /// REGLA ESTRICTA: Exclusivamente imágenes (JPG, PNG, WEBP).
        /// </summary>
        [HttpPost("{id:int}/imagenes")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(OportunidadImagenDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<OportunidadImagenDto>> SubirImagen(
            int id,
            IFormFile archivo,
            [FromForm] SubirOportunidadImagenDto dto)
        {
            try
            {
                if (archivo == null || archivo.Length == 0)
                    return BadRequest(new { mensaje = "Debe adjuntar un archivo de imagen." });

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var userName = User.Identity?.Name ?? User.FindFirstValue(ClaimTypes.Name);

                using var stream = archivo.OpenReadStream();
                var creada = await _oportunidadService.SubirImagenAsync(id, stream, archivo.FileName, archivo.ContentType, dto, userId, userName);
                return Created($"/api/oportunidades/{id}/imagenes/{creada.Id}/archivo", creada);
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
                return StatusCode(500, new { mensaje = "Error al subir la imagen.", detalle = ex.Message });
            }
        }

        /// <summary>
        /// Elimina una evidencia de imagen de la oportunidad
        /// </summary>
        [HttpDelete("{id:int}/imagenes/{imagenId:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> EliminarImagen(int id, int imagenId)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var esAdmin = User.IsInRole("Administrador") || User.IsInRole("SysAdmin") || User.IsInRole("Admin");

                var ok = await _oportunidadService.EliminarImagenAsync(id, imagenId, userId, esAdmin);
                if (!ok) return NotFound(new { mensaje = "Imagen no encontrada." });

                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { mensaje = ex.Message });
            }
        }
    }
}

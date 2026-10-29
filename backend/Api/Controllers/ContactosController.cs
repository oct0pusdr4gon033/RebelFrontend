using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Domain.DTOs.Contactos;
using Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactosController : ControllerBase
    {
        private readonly IContactoService _contactoService;

        public ContactosController(IContactoService contactoService)
        {
            _contactoService = contactoService;
        }

        /// <summary>
        /// Obtiene el listado completo de la agenda de contactos con filtros opcionales.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ContactoOCAMResponseDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ContactoOCAMResponseDto>>> ObtenerTodos([FromQuery] FiltroContactoOCAMDto filtro)
        {
            var contactos = await _contactoService.ObtenerTodosAsync(filtro);
            return Ok(contactos);
        }

        /// <summary>
        /// Obtiene el detalle de un contacto específico por ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ContactoOCAMResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ContactoOCAMResponseDto>> ObtenerPorId(int id)
        {
            var contacto = await _contactoService.ObtenerPorIdAsync(id);
            if (contacto == null)
            {
                return NotFound(new { mensaje = $"No se encontró el contacto con ID #{id}." });
            }
            return Ok(contacto);
        }

        /// <summary>
        /// Registra un contacto (con o sin número de OCAM relacionada) o el primer contacto de un lote.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ContactoOCAMResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<ContactoOCAMResponseDto>> Crear([FromBody] CrearContactoOCAMDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var nombreUsuario = User.FindFirstValue("NombreCompleto")
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.Email)
                ?? "Usuario del Sistema";

            try
            {
                var creado = await _contactoService.CrearAsync(dto, usuarioId, nombreUsuario);
                return CreatedAtAction(nameof(ObtenerPorId), new { id = creado.Id }, creado);
            }
            catch (Exception ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Registra varios contactos en una sola operación (con o sin OCAM relacionada, incluyendo RUC y Nombre de Entidad).
        /// </summary>
        [HttpPost("lote")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ContactoOCAMResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<IEnumerable<ContactoOCAMResponseDto>>> CrearLote([FromBody] CrearContactoOCAMDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var nombreUsuario = User.FindFirstValue("NombreCompleto")
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.Email)
                ?? "Usuario del Sistema";

            try
            {
                var creados = await _contactoService.CrearLoteAsync(dto, usuarioId, nombreUsuario);
                return StatusCode(StatusCodes.Status201Created, creados);
            }
            catch (Exception ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
        }

        /// <summary>
        /// Regla de negocio: Los registros de trazabilidad son inmutables y no se pueden eliminar.
        /// </summary>
        [HttpDelete("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public ActionResult Eliminar(int id)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                mensaje = "Por directiva de auditoría y trazabilidad, los contactos son inmutables y no se pueden eliminar una vez registrados."
            });
        }
    }
}

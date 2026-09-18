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
    public class UsuariosController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;

        public UsuariosController(IUsuarioService usuarioService)
        {
            _usuarioService = usuarioService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool incluirInactivos = false)
        {
            var usuarios = await _usuarioService.ObtenerTodosAsync(incluirInactivos);
            return Ok(usuarios);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var usuario = await _usuarioService.ObtenerPorIdAsync(id);
            if (usuario == null)
                return NotFound(new { mensaje = $"Usuario con Id '{id}' no encontrado." });
            return Ok(usuario);
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _usuarioService.ObtenerRolesAsync();
            return Ok(roles);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CrearUsuarioRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _usuarioService.CrearAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { mensaje = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] ActualizarUsuarioRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var updated = await _usuarioService.ActualizarAsync(id, request);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { mensaje = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> SoftDelete(string id)
        {
            var ok = await _usuarioService.EliminarSoftAsync(id);
            return ok ? NoContent() : NotFound(new { mensaje = $"Usuario con Id '{id}' no encontrado." });
        }

        [HttpPatch("{id}/restaurar")]
        public async Task<IActionResult> Restaurar(string id)
        {
            var ok = await _usuarioService.RestaurarAsync(id);
            return ok ? NoContent() : NotFound(new { mensaje = $"Usuario con Id '{id}' no encontrado." });
        }
    }
}

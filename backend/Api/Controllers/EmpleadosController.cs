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
    public class EmpleadosController : ControllerBase
    {
        private readonly IEmpleadoService _empleadoService;

        public EmpleadosController(IEmpleadoService empleadoService)
        {
            _empleadoService = empleadoService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool incluirInactivos = false)
        {
            var empleados = await _empleadoService.ObtenerTodosAsync(incluirInactivos);
            return Ok(empleados);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var empleado = await _empleadoService.ObtenerPorIdAsync(id);
            if (empleado == null)
                return NotFound(new { mensaje = $"Empleado con Id '{id}' no encontrado." });
            return Ok(empleado);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CrearEmpleadoRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _empleadoService.CrearAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { mensaje = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] ActualizarEmpleadoRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var updated = await _empleadoService.ActualizarAsync(id, request);
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
                var ok = await _empleadoService.EliminarSoftAsync(id);
                return ok ? NoContent() : NotFound(new { mensaje = $"Empleado con Id '{id}' no encontrado." });
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
                var ok = await _empleadoService.RestaurarAsync(id);
                return ok ? NoContent() : NotFound(new { mensaje = $"Empleado con Id '{id}' no encontrado." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
        }
    }
}

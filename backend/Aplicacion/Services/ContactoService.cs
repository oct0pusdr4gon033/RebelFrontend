using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Domain.DTOs.Contactos;
using Domain.Interfaces.Repositories;
using Domain.Interfaces.Services;
using Domain.Models;

namespace Aplicacion.Services
{
    public class ContactoService : IContactoService
    {
        private readonly IContactoRepository _contactoRepository;

        public ContactoService(IContactoRepository contactoRepository)
        {
            _contactoRepository = contactoRepository;
        }

        public async Task<IEnumerable<ContactoOCAMResponseDto>> ObtenerTodosAsync(FiltroContactoOCAMDto? filtro = null)
        {
            var contactos = await _contactoRepository.ObtenerTodosAsync(
                filtro?.NumeroOCAM,
                filtro?.EmpresaRelacionada,
                filtro?.TipoRelacion,
                filtro?.Busqueda,
                filtro?.RucEntidad
            );

            return contactos.Select(MapToResponseDto);
        }

        public async Task<ContactoOCAMResponseDto?> ObtenerPorIdAsync(int id)
        {
            var contacto = await _contactoRepository.ObtenerPorIdAsync(id);
            return contacto == null ? null : MapToResponseDto(contacto);
        }

        public async Task<ContactoOCAMResponseDto> CrearAsync(CrearContactoOCAMDto dto, string usuarioId, string nombreUsuario)
        {
            var creados = (await CrearLoteAsync(dto, usuarioId, nombreUsuario)).ToList();
            return creados.First();
        }

        public async Task<IEnumerable<ContactoOCAMResponseDto>> CrearLoteAsync(CrearContactoOCAMDto dto, string usuarioId, string nombreUsuario)
        {
            if (string.IsNullOrWhiteSpace(dto.EmpresaRelacionada))
            {
                throw new ArgumentException("El nombre de la entidad o empresa relacionada es obligatorio.");
            }

            // Construir lista de contactos a registrar (soporta 1 o varios contactos por registro)
            var itemsContacto = new List<PersonaContactoItemDto>();

            if (dto.Contactos != null && dto.Contactos.Any())
            {
                itemsContacto.AddRange(
                    dto.Contactos.Where(c =>
                        !string.IsNullOrWhiteSpace(c.ContactoNumero) ||
                        !string.IsNullOrWhiteSpace(c.ContactoNombre))
                );
            }

            if (!itemsContacto.Any() &&
                (!string.IsNullOrWhiteSpace(dto.ContactoNumero) || !string.IsNullOrWhiteSpace(dto.ContactoNombre)))
            {
                itemsContacto.Add(new PersonaContactoItemDto
                {
                    ContactoNumero = dto.ContactoNumero ?? string.Empty,
                    ContactoNombre = dto.ContactoNombre ?? string.Empty,
                    ContactoAreaCargo = dto.ContactoAreaCargo
                });
            }

            if (!itemsContacto.Any())
            {
                throw new ArgumentException("Debes ingresar al menos un contacto (nombre y número de teléfono).");
            }

            foreach (var item in itemsContacto)
            {
                if (string.IsNullOrWhiteSpace(item.ContactoNombre))
                    throw new ArgumentException("El nombre del contacto es obligatorio en todos los registros.");
                if (string.IsNullOrWhiteSpace(item.ContactoNumero))
                    throw new ArgumentException("El número de contacto es obligatorio en todos los registros.");
            }

            bool sinOcam = dto.SinOcamRelacionada || string.IsNullOrWhiteSpace(dto.NumeroOCAM);
            string numeroOcamFinal = sinOcam
                ? "SIN OCAM"
                : dto.NumeroOCAM!.Trim().ToUpperInvariant();

            string rucFinal = (dto.RucEntidad ?? string.Empty).Trim();
            string tipoRelacionFinal = string.IsNullOrWhiteSpace(dto.TipoRelacion)
                ? "Entidad Solicitante"
                : dto.TipoRelacion.Trim();

            string motivoFinal = string.IsNullOrWhiteSpace(dto.ContactoMotivo)
                ? (sinOcam
                    ? "REGISTRO DIRECTO DE CONTACTO DE ENTIDAD (SIN OCAM RELACIONADA)"
                    : "SEGUIMIENTO Y COORDINACIÓN DE ORDEN DE COMPRA")
                : dto.ContactoMotivo.Trim();

            string respuestaFinal = string.IsNullOrWhiteSpace(dto.Respuesta)
                ? "CONTACTO REGISTRADO EN DIRECTORIO DE ENTIDAD"
                : dto.Respuesta.Trim();

            string grupoId = itemsContacto.Count > 1
                ? $"GRP-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}"
                : null!;

            string? contactosJson = itemsContacto.Count > 1
                ? JsonSerializer.Serialize(itemsContacto)
                : null;

            string autor = string.IsNullOrWhiteSpace(nombreUsuario) ? "Usuario del Sistema" : nombreUsuario.Trim();
            string? autorId = string.IsNullOrWhiteSpace(usuarioId) ? null : usuarioId.Trim();

            var entidades = itemsContacto.Select(item => new ContactoOCAM
            {
                NumeroOCAM = numeroOcamFinal,
                SinOcamRelacionada = sinOcam,
                RucEntidad = string.IsNullOrWhiteSpace(rucFinal) ? null : rucFinal,
                OportunidadId = sinOcam ? null : dto.OportunidadId,
                OrdenCompraId = sinOcam ? null : dto.OrdenCompraId,
                ContactoNumero = item.ContactoNumero.Trim(),
                ContactoNombre = item.ContactoNombre.Trim().ToUpperInvariant(),
                ContactoAreaCargo = string.IsNullOrWhiteSpace(item.ContactoAreaCargo)
                    ? "CONTACTO DE ENTIDAD"
                    : item.ContactoAreaCargo.Trim().ToUpperInvariant(),
                ContactoMotivo = motivoFinal,
                Respuesta = respuestaFinal,
                TipoRelacion = tipoRelacionFinal,
                EmpresaRelacionada = dto.EmpresaRelacionada.Trim(),
                EmpresaId = dto.EmpresaId,
                GrupoRegistroId = grupoId,
                ContactosAdicionalesJson = contactosJson,
                RegistradoPor = autor,
                RegistradoPorUsuarioId = autorId,
                FechaRegistro = DateTime.UtcNow,
                EsInmutable = true
            }).ToList();

            var guardados = await _contactoRepository.CrearVariosAsync(entidades);
            return guardados.Select(MapToResponseDto).ToList();
        }

        private static ContactoOCAMResponseDto MapToResponseDto(ContactoOCAM c)
        {
            List<PersonaContactoItemDto>? hermanos = null;
            if (!string.IsNullOrWhiteSpace(c.ContactosAdicionalesJson))
            {
                try
                {
                    hermanos = JsonSerializer.Deserialize<List<PersonaContactoItemDto>>(c.ContactosAdicionalesJson);
                }
                catch
                {
                    // ignore
                }
            }

            return new ContactoOCAMResponseDto
            {
                Id = c.Id,
                NumeroOCAM = c.NumeroOCAM,
                SinOcamRelacionada = c.SinOcamRelacionada || string.Equals(c.NumeroOCAM, "SIN OCAM", StringComparison.OrdinalIgnoreCase),
                RucEntidad = c.RucEntidad,
                OportunidadId = c.OportunidadId,
                OrdenCompraId = c.OrdenCompraId,
                ContactoNumero = c.ContactoNumero,
                ContactoNombre = c.ContactoNombre,
                ContactoAreaCargo = c.ContactoAreaCargo,
                ContactoMotivo = c.ContactoMotivo,
                Respuesta = c.Respuesta,
                TipoRelacion = c.TipoRelacion,
                EmpresaRelacionada = c.EmpresaRelacionada,
                EmpresaId = c.EmpresaId,
                GrupoRegistroId = c.GrupoRegistroId,
                ContactosRegistrados = hermanos,
                RegistradoPor = c.RegistradoPor,
                RegistradoPorUsuarioId = c.RegistradoPorUsuarioId,
                FechaRegistro = c.FechaRegistro,
                EsInmutable = c.EsInmutable
            };
        }
    }
}

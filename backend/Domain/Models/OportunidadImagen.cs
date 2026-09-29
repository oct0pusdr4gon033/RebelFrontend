using System;

namespace Domain.Models
{
    /// <summary>
    /// Evidencia fotográfica / captura de pantalla vinculada a una Oportunidad (Relación 1 a N).
    /// El archivo binario de la imagen se almacena directamente en la base de datos (PostgreSQL BYTEA).
    /// </summary>
    public class OportunidadImagen
    {
        public int Id { get; set; }

        public int OportunidadId { get; set; }
        public virtual Oportunidad? Oportunidad { get; set; }

        public string TipoEvidencia { get; set; } = string.Empty;
        public string NombreArchivo { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long TamanoBytes { get; set; }
        public string TamanoArchivo { get; set; } = string.Empty;

        /// <summary>
        /// Storage directo en base de datos (PostgreSQL BYTEA)
        /// </summary>
        public byte[] Datos { get; set; } = Array.Empty<byte>();

        public string? Comentario { get; set; }

        public string SubidoPor { get; set; } = string.Empty;
        public string? SubidoPorUsuarioId { get; set; }
        public virtual AppUser? SubidoPorUsuario { get; set; }

        public DateTime FechaSubida { get; set; } = DateTime.UtcNow;
    }
}

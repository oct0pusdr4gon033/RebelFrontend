using System.Collections.Generic;

namespace Domain.Models
{
    // ── Modelos adicionales referenciados por el contexto ──────────────────────

    public class AcuerdoMarco
    {
        public int Id { get; set; }
        public string? Codigo { get; set; }
        public string? Descipcion { get; set; }   // Mantiene el typo original del proyecto
        public bool Activo { get; set; } = true;
    }

    public class Empresa
    {
        public int Id { get; set; }
        public string Ruc { get; set; } = string.Empty;
        public string RazonSocial { get; set; } = string.Empty;
        public string? NombreComercial { get; set; }
        public bool Activo { get; set; } = true;
    }
}

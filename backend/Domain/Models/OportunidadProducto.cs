using System;
using System.Collections.Generic;

namespace Domain.Models
{
    /// <summary>
    /// Productos e ítems del requerimiento de la Oportunidad
    /// </summary>
    public class OportunidadProducto
    {
        public int Id { get; set; }

        public int OportunidadId { get; set; }
        public virtual Oportunidad Oportunidad { get; set; } = null!;

        // Número de parte del producto (Requerido)
        public string NumeroParte { get; set; } = string.Empty;

        // Descripción detallada del producto (Opcional si solo tiene número de parte)
        public string? Descripcion { get; set; }

        // Cantidad de unidades requeridas
        public int Cantidad { get; set; }

        // Límite unitario en Soles (S/) fijado por Perú Compras para este ítem
        public decimal LimiteUnitario { get; set; }

        // Subtotal del límite: Cantidad * LimiteUnitario
        public decimal LimiteSubtotal { get; set; }

        // ── DATOS DE LA PROFORMA PERÚ COMPRAS (OPCIONALES) ──
        // Código de ficha del producto (ej. 756)
        public string? FichaProducto { get; set; }

        // Marca del producto según Perú Compras (ej. "HP")
        public string? MarcaProducto { get; set; }

        // Moneda base de la proforma (PEN por defecto)
        public string? Moneda { get; set; }

        // Precio unitario base sin IGV
        public decimal? PrecioUnitarioBase { get; set; }

        // Precio unitario ofertado por la ejecutiva
        public decimal? PrecioUnitarioOfertado { get; set; }

        // Condiciones adicionales del requerimiento (texto libre)
        public string? CondicionesAdicionales { get; set; }

        // Referencia o enlace a la ficha técnica (documento)
        public string? FichaTecnica { get; set; }

        // ── AJUSTE DE FLETE (PRECIOS DESFASADOS - APROBADO POR ADMINISTRADOR) ──
        // Porcentaje vigente de flete (% sobre el límite unitario) una vez APROBADO
        public decimal? AjusteFletePorcentaje { get; set; }

        // Porcentaje solicitado por la ejecutiva pendiente de resolución
        public decimal? AjusteFleteSolicitadoPorcentaje { get; set; }

        // Justificación o motivo de la solicitud de ajuste
        public string? AjusteFleteMotivo { get; set; }

        // Estado del ajuste: "Pendiente", "Aprobado", "Rechazado"
        public string? AjusteFleteEstado { get; set; }

        // Comentario u observación del administrador al aprobar o rechazar
        public string? AjusteFleteComentarioAdmin { get; set; }

        // ── PROVEEDORES Y COSTOS POR ÍTEM (1:N) ──
        public virtual ICollection<ItemProveedor> Proveedores { get; set; } = new List<ItemProveedor>();
    }
}

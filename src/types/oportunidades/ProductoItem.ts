
import type { ItemProveedor } from "./ItemProveedor";
import type { EstadoAjusteFlete } from "./EstadoAjusteFlete";
/** Ítem / producto individual dentro del requerimiento */
export interface ProductoItem {
    id: string | number;
    numeroParte: string;
    descripcion: string;
    cantidad: number;
    /** Límite unitario en Soles (S/) fijado por Perú Compras */
    limiteUnitario: number;
    // ── Datos de la proforma Perú Compras (opcionales) ──
    fichaProducto?: string;
    marcaProducto?: string;
    moneda?: string;
    precioUnitarioBase?: number | null;
    precioUnitarioOfertado?: number | null;
    condicionesAdicionales?: string;
    fichaTecnica?: string;
    // ── Proveedores y costos por ítem (N por ítem) ──
    proveedores?: ItemProveedor[];
    // ── Ajuste de flete (precios de Perú Compras desfasados). Requiere aprobación de la administradora ──
    /** % vigente sobre el límite unitario (solo cuando fue APROBADO) */
    ajusteFletePorcentaje?: number | null;
    /** % solicitado por la ejecutiva, pendiente de resolución */
    ajusteFleteSolicitadoPorcentaje?: number | null;
    /** Justificación obligatoria de la solicitud */
    ajusteFleteMotivo?: string | null;
    ajusteFleteEstado?: EstadoAjusteFlete | null;
    /** Comentario de la administradora al aprobar / rechazar */
    ajusteFleteComentarioAdmin?: string | null;
}
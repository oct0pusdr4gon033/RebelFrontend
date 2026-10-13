/* ── Proveedor y costos asignados a un ítem (N proveedores por ítem) ── */
export interface ItemProveedor {
    id: string | number;
    nombreProveedor: string;
    cantidad: number;
    costoUnitario: number;
    costoEnvio: number;
}

/* ── Item de Producto dentro de la Oportunidad ── */
export interface ProductoItem {
    id: string | number;
    numeroParte: string;
    descripcion: string;
    cantidad: number;
    limiteUnitario: number; // En Soles S/
    // ── Datos de la proforma Perú Compras (opcionales) ──
    fichaProducto?: string;
    marcaProducto?: string;
    moneda?: string; // PEN | USD
    precioUnitarioBase?: number | null;
    precioUnitarioOfertado?: number | null;
    condicionesAdicionales?: string;
    fichaTecnica?: string;
    // ── Proveedores y costos por ítem (N por ítem) ──
    proveedores?: ItemProveedor[];
}
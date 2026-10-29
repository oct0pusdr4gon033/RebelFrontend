/** Proveedor y costos asignados a un ítem (N proveedores por ítem) */
export interface ItemProveedor {
    id: string | number;
    nombreProveedor: string;
    /** Cantidad del ítem asignada a este proveedor */
    cantidad: number;
    /** Costo unitario ofrecido por el proveedor */
    costoUnitario: number;
    /** Costo de envío independiente de este proveedor */
    costoEnvio: number;
}

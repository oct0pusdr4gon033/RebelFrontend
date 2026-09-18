/* ── Item de Producto dentro de la Oportunidad ── */
export interface ProductoItem {
    id: string | number;
    numeroParte: string;
    descripcion: string;
    cantidad: number;
    limiteUnitario: number; // En Soles S/
}
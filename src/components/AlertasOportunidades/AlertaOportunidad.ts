export interface AlertaOportunidad {
    id: number;
    numeroRequerimiento: string;
    creadoPor: string;
    /** Datos obligatorios que faltan en la oportunidad */
    faltantes: string[];
    /** N° de parte con ajuste de flete pendiente de aprobación */
    ajustesPendientes: string[];
}


/** Modelo para evidencias de licitación subidas */
export interface EvidenciaItem {
    id: string | number;
    oportunidadId: string | number;
    numeroRequerimiento: string;
    tipoDocumento: string;
    nombreArchivo: string;
    tamanoArchivo: string;
    subidoPor: string;
    fechaSubida: string;
    estado: 'Verificado' | 'En Revisión';
    comentario?: string;
}

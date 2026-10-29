import type { EstadoOC } from "./EstadoOC";

/** Documento adjunto en el pool de la Orden de Compra */
export interface DocumentoOCItem {
    id?: string | number;
    url: string;
    nombre: string;
    tamanoBytes?: number;
    tamanoTexto?: string;
    tipo?: string;
    fechaSubida?: string;
}

/** Orden de Compra emitida por la entidad pública (Bloque 2) */
export interface OrdenCompra {
    id: number;
    oportunidadId: number;
    numeroOC: string;
    fechaEmisionOC?: string | null;
    estadoOC: EstadoOC;
    motivoRechazo?: string | null;
    fechaDecisionOC?: string | null;
    costoInicial?: number | null;
    costoRenegociado?: number | null;
    margenAdicional?: number | null;
    fechaRenegociacion?: string | null;
    fechaDespacho?: string | null;
    transportista?: string | null;
    noGuiaRemision?: string | null;
    fechaEntrega?: string | null;
    // ── Buena Pro / Adjudicación (Perú Compras) ──
    nroOCAM?: string | null;
    nroExpediente?: string | null;
    nroFolio?: string | null;
    archivoOCUrl?: string | null;
    archivoNombre?: string | null;
    /** Colección / Pool de documentos adjuntos a la Orden de Compra */
    documentosPool?: DocumentoOCItem[];
    unidad?: string | null;
    codigoCIAF?: string | null;
    montoOCAM?: number | null;
    fechaRegistro: string;
    fechaActualizacion?: string | null;
}

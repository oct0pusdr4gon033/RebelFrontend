export const AREAS_TICKET = [0, 1, 2, 3, 4, 5] as const;
export type AreaTicket = (typeof AREAS_TICKET)[number];

export const ETIQUETAS_AREA_TICKET: Record<AreaTicket, string> = {
  0: 'Administración',
  1: 'Recursos Humanos',
  2: 'Finanzas y Contabilidad',
  3: 'Marketing',
  4: 'Ventas',
  5: 'TI',
};

export const CATEGORIAS_TICKET = [0, 1, 2, 3, 4] as const;
export type CategoriaTicket = (typeof CATEGORIAS_TICKET)[number];

export const ETIQUETAS_CATEGORIA_TICKET: Record<CategoriaTicket, string> = {
  0: 'Correo',
  1: 'Instalación de Software',
  2: 'Hardware',
  3: 'Redes',
  4: 'Otro',
};

export const PRIORIDADES_TICKET = [0, 1, 2] as const;
export type PrioridadTicket = (typeof PRIORIDADES_TICKET)[number];

export const ETIQUETAS_PRIORIDAD_TICKET: Record<PrioridadTicket, string> = {
  0: 'Baja',
  1: 'Media',
  2: 'Alta',
};

export const ESTADOS_TICKET = [0, 1, 2, 3] as const;
export type EstadoTicket = (typeof ESTADOS_TICKET)[number];

export const ETIQUETAS_ESTADO_TICKET: Record<EstadoTicket, string> = {
  0: 'Pendiente',
  1: 'En atención',
  2: 'Atendido',
  3: 'Cerrado',
};

export const ACCIONES_HISTORIAL_TICKET = [0, 1, 2, 3, 4] as const;
export type AccionHistorialTicket = (typeof ACCIONES_HISTORIAL_TICKET)[number];

export const ETIQUETAS_ACCION_HISTORIAL_TICKET: Record<AccionHistorialTicket, string> = {
  0: 'Creación',
  1: 'Asignación',
  2: 'Cambio de estado',
  3: 'Comentario',
  4: 'Evidencia agregada',
};

export interface CrearTicketRequest {
  area: AreaTicket;
  categoria: CategoriaTicket;
  prioridad: PrioridadTicket;
  descripcion: string;
  evidenciaReferencia?: string | null;
}

export interface CrearTicketConEvidenciasRequest extends CrearTicketRequest {
  archivos?: File[];
}

export interface TicketFiltroRequest {
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  area?: AreaTicket;
  categoria?: CategoriaTicket;
}

export interface AsignarTicketRequest {
  empleadoTecnicoId: number;
}

export interface CambiarEstadoTicketRequest {
  estado: EstadoTicket;
  detalle?: string | null;
}

export interface AgregarComentarioTicketRequest {
  comentario: string;
}

export interface TicketTecnicoAsignableDto {
  id: number;
  nombreCompleto: string;
}

export interface TicketResponseDto {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  area: AreaTicket;
  categoria: CategoriaTicket;
  prioridad: PrioridadTicket;
  descripcion: string;
  evidenciaReferencia: string | null;
  estado: EstadoTicket;
  fechaCreacion: string;
  asignadoAEmpleadoId: number | null;
  asignadoAEmpleadoNombre: string | null;
  asignadoPorUserId: string | null;
  fechaAsignacion: string | null;
  atendidoPorUserId: string | null;
  fechaAtencion: string | null;
  fechaAtendido: string | null;
  cerradoPorUserId: string | null;
  fechaCierre: string | null;
  comentarios: ComentarioTicketResponseDto[];
  historial: HistorialTicketResponseDto[];
}

export interface ComentarioTicketResponseDto {
  id: number;
  autorUserId: string;
  autorNombreCompleto?: string | null;
  comentario: string;
  fecha: string;
}

export interface HistorialTicketResponseDto {
  id: number;
  accion: AccionHistorialTicket;
  estadoAnterior: EstadoTicket | null;
  estadoNuevo: EstadoTicket | null;
  detalle: string | null;
  usuarioResponsableUserId: string;
  fecha: string;
}

export interface TicketSeguimientoResponseDto {
  ticketId: number;
  comentarios: ComentarioTicketResponseDto[];
  historial: HistorialTicketResponseDto[];
}

export interface TicketEvidenciaResponseDto {
  id: number;
  ticketId: number;
  historialTicketId: number;
  nombreOriginal: string;
  contentType: string;
  tamanoBytes: number;
  usuarioAdjuntoUserId: string;
  fechaUtc: string;
  urlContenido: string;
}

export interface TicketEvidenciaContenido {
  blob: Blob;
  nombreArchivo: string;
  contentType: string;
}

export const TICKET_MAX_ARCHIVOS = 3;
export const TICKET_MAX_TAMANO_BYTES = 5 * 1024 * 1024;
export const TICKET_TIPOS_ARCHIVO_PERMITIDOS = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
} as const;

export const TIPOS_SOLICITUD = [0, 1, 2] as const;

export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

export const ETIQUETAS_TIPO_SOLICITUD: Record<TipoSolicitud, string> = {
  0: 'Vacaciones',
  1: 'Permiso',
  2: 'Descanso médico',
};

export const ESTADOS_SOLICITUD = [0, 1, 2, 3] as const;

export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const ETIQUETAS_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  0: 'Pendiente',
  1: 'Aprobada',
  2: 'Rechazada',
  3: 'Observada',
};

export const ACCIONES_HISTORIAL_SOLICITUD = [0, 1, 2, 3, 4] as const;

export type AccionHistorialSolicitud = (typeof ACCIONES_HISTORIAL_SOLICITUD)[number];

export const ETIQUETAS_ACCION_HISTORIAL_SOLICITUD: Record<AccionHistorialSolicitud, string> = {
  0: 'Solicitud creada',
  1: 'Solicitud observada',
  2: 'Subsanación enviada',
  3: 'Solicitud aprobada',
  4: 'Solicitud rechazada',
};

export interface CrearSolicitudRequest {
  tipo: TipoSolicitud;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  archivo?: File | null;
}

export interface ResolverSolicitudRequest {
  estado: EstadoSolicitud;
  observacionResolucion: string | null;
}

export interface SubsanarSolicitudRequest {
  tipo: TipoSolicitud;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  evidenciaReferencia: string;
  comentario: string;
  archivos: File[];
}

export interface SolicitudResponse {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  sedeId: number | null;
  tipo: TipoSolicitud;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  evidenciaReferencia: string | null;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  resueltoPorUserId: string | null;
  resueltoPorNombreCompleto?: string | null;
  resueltoPorRoles?: SolicitudResponsableRol[];
  observacionResolucion: string | null;
  tieneEvidencia?: boolean;
  evidenciaNombreArchivo?: string | null;
  evidenciaContentType?: string | null;
  evidenciaTamanoBytes?: number | null;
  evidencias?: SolicitudEvidenciaMetadatos[];
}

export interface SolicitudResponsableRol {
  rolId: string | null;
  rolNombre: string | null;
}

export interface SolicitudEvidenciaMetadatos {
  id: number;
  solicitudId: number;
  historialId: number | null;
  nombreArchivo: string;
  contentType: string;
  tamanoBytes: number;
}

export interface SolicitudHistorialResponse {
  id: number;
  solicitudId: number;
  accion: AccionHistorialSolicitud;
  usuarioResponsableUserId: string;
  usuarioResponsableNombreCompleto?: string | null;
  usuarioResponsableRoles?: SolicitudResponsableRol[];
  fecha: string;
  comentario: string | null;
  estadoAnterior: EstadoSolicitud | null;
  estadoNuevo: EstadoSolicitud | null;
  datosSolicitudAntes?: SolicitudDatosSnapshot | null;
  datosSolicitudDespues?: SolicitudDatosSnapshot | null;
  evidencias?: SolicitudEvidenciaMetadatos[];
}

export interface SolicitudDatosSnapshot {
  tipo: TipoSolicitud | null;
  titulo: string | null;
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  evidenciaReferencia: string | null;
}

export interface EvidenciaSolicitud {
  blob: Blob;
  nombreArchivo: string;
}

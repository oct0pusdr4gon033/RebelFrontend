export const TipoNotificacion = {
  TicketNuevo: 1,
  TicketAsignado: 2,
  TicketNuevoComentario: 3,
  TicketAtendido: 4,
  TicketReabierto: 5,
  TicketCerrado: 6,
  SolicitudNueva: 7,
  SolicitudObservada: 8,
  SolicitudAprobada: 9,
  SolicitudRechazada: 10,
  SubsanacionEnviada: 11,
  TicketEnAtencion: 12,
} as const;

export type TipoNotificacion =
  (typeof TipoNotificacion)[keyof typeof TipoNotificacion];

export interface NotificacionDto {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  fechaCreacion: string;
  leida: boolean;
  fechaLectura: string | null;
  tipoEntidadRelacionada: string | null;
  idEntidadRelacionada: number | null;
}

export interface NotificacionesPageDto {
  items: NotificacionDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

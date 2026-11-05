import type {
  AreaTicket,
  CategoriaTicket,
  EstadoTicket,
  PrioridadTicket,
} from './Ticket';

export interface EstadoTicketEstadisticaDto {
  estado: EstadoTicket;
  cantidad: number;
}

export interface CategoriaTicketEstadisticaDto {
  categoria: CategoriaTicket;
  cantidad: number;
}

export interface AreaTicketEstadisticaDto {
  area: AreaTicket;
  cantidad: number;
}

export interface PrioridadTicketEstadisticaDto {
  prioridad: PrioridadTicket;
  cantidad: number;
}

export interface FrecuenciaAtencionTicketDto {
  periodoInicio: string;
  cantidad: number;
}

export interface CargaTecnicoTicketDto {
  empleadoId: number;
  nombreCompleto: string;
  cantidadTickets: number;
}

export interface TicketDashboardGlobalResponseDto {
  fechaInicio: string;
  fechaFin: string;
  totalTicketsPeriodo: number;
  estadoActual: EstadoTicketEstadisticaDto[];
  distribucionPorCategoria: CategoriaTicketEstadisticaDto[];
  distribucionPorArea: AreaTicketEstadisticaDto[];
  distribucionPorPrioridad: PrioridadTicketEstadisticaDto[];
  promedioMinutosHastaPrimeraAtencion: number | null;
  promedioMinutosHastaPrimeraResolucion: number | null;
  resolucionesPorDia: FrecuenciaAtencionTicketDto[];
  resolucionesPorSemana: FrecuenciaAtencionTicketDto[];
  resolucionesPorMes: FrecuenciaAtencionTicketDto[];
  areasConMasTickets: AreaTicketEstadisticaDto[];
  ticketsPendientesDeAsignacion: number;
  cargaPorTecnico: CargaTecnicoTicketDto[];
}

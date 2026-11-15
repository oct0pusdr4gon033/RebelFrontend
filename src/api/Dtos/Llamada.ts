export type ResultadoLlamada =
  | 'SIN CONTACTO'
  | 'LOGISTICO'
  | 'LOG+COTIZ'
  | 'LOG+OC';

export const RESULTADOS_LLAMADA: ResultadoLlamada[] = [
  'SIN CONTACTO',
  'LOGISTICO',
  'LOG+COTIZ',
  'LOG+OC',
];

export interface EstadoCuotaLlamadas {
  fechaLocal: string;
  horaLocal: string;
  limiteDiario: number;
  realizadasHoy: number;
  restantesHoy: number;
  limiteSemanal: number;
  realizadasSemana: number;
  restantesSemana: number;
  horaInicio: string;
  horaFin: string;
  horaCorte: string;
  minutosRestantesCorte: number;
  dentroHorario: boolean;
  puedeRegistrarLlamada: boolean;
  estaBloqueado: boolean;
  tieneExcepcion: boolean;
  aplicaCuota: boolean;
  esFinDeSemana: boolean;
  esDiaNoLaborable: boolean;
  semaforo: string;
  motivo?: string | null;
  mensaje: string;
  bloqueadoHastaUtc?: string | null;
}

export interface RegistrarLlamadaRequest {
  directorioId?: number | null;
  numeroMarcado: string;
  contactoNombre?: string | null;
  entidadNombre?: string | null;
  resultadoSemaforo: ResultadoLlamada | string;
  solicitoCotizacion?: boolean;
  generoOc?: boolean;
  esLogistico?: boolean | null;
  comentario?: string | null;
  duracionSegundos?: number | null;
  proximaLlamadaProgramada?: string | null;
}

export interface LlamadaResponse {
  id: number;
  directorioId?: number | null;
  ejecutivaId: number;
  ejecutivaNombre: string;
  fechaHoraLlamadaUtc: string;
  fechaDia: string;
  horaLocal: string;
  numeroMarcado: string;
  contactoNombre?: string | null;
  entidadNombre?: string | null;
  resultadoSemaforo: string;
  esLogistico: boolean;
  solicitoCotizacion: boolean;
  generoOc: boolean;
  comentario?: string | null;
  proximaLlamadaProgramadaUtc?: string | null;
  duracionSegundos?: number | null;
  contabilizaCuota: boolean;
}

export interface DirectorioLlamada {
  id: number;
  loteId: string;
  itemReferencia?: number | null;
  fecha?: string | null;
  hora?: string | null;
  mes?: string | null;
  ruc?: string | null;
  nombreEntidad: string;
  sector?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  nombreContacto?: string | null;
  cargoContacto?: string | null;
  telefono?: string | null;
  telefonoLimpio?: string | null;
  correo?: string | null;
  comentario?: string | null;
  llamada: boolean;
  cliente: boolean;
  logistico: boolean;
  cotizacion: boolean;
  oc: boolean;
  semaforizacion?: string | null;
  ejecutivaAsignadaId?: number | null;
  ejecutivaAsignadaNombre?: string | null;
  fechaCargaUtc: string;
  activo: boolean;
  ultimaLlamadaUtc?: string | null;
  ultimoResultado?: string | null;
  proximaLlamadaProgramadaUtc?: string | null;
}

export interface DirectorioFiltro {
  busqueda?: string;
  semaforizacion?: string;
  soloPendientes?: boolean;
  ejecutivaId?: number;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AgendaLlamada {
  directorioId?: number | null;
  llamadaId?: number | null;
  ruc?: string | null;
  nombreEntidad: string;
  nombreContacto?: string | null;
  telefono?: string | null;
  proximaLlamadaProgramadaUtc?: string | null;
  resultadoSemaforo?: string | null;
  comentario?: string | null;
}

export interface ExcepcionLlamadaRequest {
  ejecutivaId: number;
  fechaDia?: string;
  motivo: string;
}

export interface ExcepcionLlamada {
  id: number;
  ejecutivaId: number;
  ejecutivaNombre: string;
  fechaDia: string;
  desbloqueadoPorUserId: string;
  desbloqueadoPorNombre?: string | null;
  motivo: string;
  fechaDesbloqueoUtc: string;
  activa: boolean;
}

export interface ResumenEjecutivaLlamadas {
  ejecutivaId: number;
  nombre: string;
  llamadasHoy: number;
  metaDiaria: number;
  cumplimientoPorcentaje: number;
  llamadasSemana: number;
  metaSemanal: number;
  estaBloqueada: boolean;
  tieneExcepcion: boolean;
  aplicaCuota: boolean;
  llamadasLogisticas: number;
  llamadasCotizacion: number;
  llamadasOc: number;
  conversionPorcentaje: number;
  ultimaLlamadaUtc?: string | null;
}

export interface SupervisionLlamadas {
  fecha: string;
  generadoEnUtc: string;
  totalLlamadas: number;
  totalEjecutivas: number;
  ejecutivas: ResumenEjecutivaLlamadas[];
  excepciones: ExcepcionLlamada[];
}

export interface EjecutivaDisponible {
  id: number;
  nombre: string;
  cargaActual: number;
}

export interface ErrorCargaFila {
  fila: number;
  mensaje: string;
}

export interface MuestraCarga {
  fila: number;
  ruc?: string | null;
  nombreEntidad?: string | null;
  nombreContacto?: string | null;
  telefono?: string | null;
  semaforizacion?: string | null;
}

export interface ConfirmarCargaLlamadasRequest {
  modoAsignacion: 'Automatica' | 'Seleccionada' | string;
  ejecutivaIds?: number[];
}

export interface PrevisualizacionCargaLlamadas {
  nombreArchivo: string;
  hoja: string;
  totalFilas: number;
  filasValidas: number;
  filasInvalidas: number;
  filasDuplicadas: number;
  muestra: MuestraCarga[];
  errores: ErrorCargaFila[];
  ejecutivas: EjecutivaDisponible[];
}

export interface ResultadoCargaLlamadas {
  loteId: string;
  nombreArchivo: string;
  totalFilas: number;
  insertadas: number;
  actualizadas: number;
  omitidas: number;
  errores: number;
  detalleErrores: ErrorCargaFila[];
}

export interface HistorialLlamadasFiltro {
  fechaInicio?: string;
  fechaFin?: string;
  ejecutivaId?: number;
  resultado?: string;
  page?: number;
  pageSize?: number;
}

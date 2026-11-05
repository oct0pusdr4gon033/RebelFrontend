export interface ExcepcionHorarioEmpleadoRequest {
  empleadoId: number;
  fechaInicio: string;
  fechaFin: string;
  esLaborable: boolean;
  horaIngreso1: string | null;
  horaSalida1: string | null;
  horaIngreso2: string | null;
  horaSalida2: string | null;
  motivo: string;
}

export interface ExcepcionHorarioEmpleadoResponse extends ExcepcionHorarioEmpleadoRequest {
  id: number;
  configuradoPorUserId: string | null;
  creadoEnUtc: string;
}

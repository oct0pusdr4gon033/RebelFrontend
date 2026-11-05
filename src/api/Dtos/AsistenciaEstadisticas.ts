export interface AsistenciaDiaEstadisticaDto {
  fechaJornada: string;
  cantidadMarcaciones: number;
  minutosTardanzaIngreso1: number | null;
}

export interface EvolucionAsistenciaSemanalDto {
  semanaInicio: string;
  diasAsistidos: number;
}

export interface EvolucionAsistenciaMensualDto {
  mesInicio: string;
  diasAsistidos: number;
}

export interface AsistenciaEstadisticasPersonalesResponseDto {
  fechaInicio: string;
  fechaFin: string;
  diasConAsistencia: number;
  promedioDiasAsistidosPorSemana: number | null;
  promedioHoraIngreso: string | null;
  promedioMinutosTardanza: number | null;
  diasConTardanza: number;
  evolucionDiaria: AsistenciaDiaEstadisticaDto[];
  evolucionSemanal: EvolucionAsistenciaSemanalDto[];
  evolucionMensual: EvolucionAsistenciaMensualDto[];
}

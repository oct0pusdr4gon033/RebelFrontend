export const TIPOS_MARCACION = [0, 1, 2, 3] as const;

export type TipoMarcacionAsistencia = (typeof TIPOS_MARCACION)[number];

export const ETIQUETAS_MARCACION: Record<TipoMarcacionAsistencia, string> = {
  0: 'Ingreso 1',
  1: 'Salida 1',
  2: 'Ingreso 2',
  3: 'Salida 2',
};

export interface MarcacionAsistenciaDto {
  id: number;
  tipo: TipoMarcacionAsistencia;
  fechaHoraUtc: string;
}

export interface MarcacionAsistenciaResponse extends MarcacionAsistenciaDto {
  empleadoId: number;
  empleadoNombre: string;
  sedeId: number;
  fechaJornada: string;
}

export interface MiAsistenciaDiariaDto {
  empleadoId: number;
  fechaJornada: string;
  esNoLaborable: boolean;
  tieneHorario: boolean;
  motivoNoLaborable: string | null;
  minutosTrabajados: number | null;
  minutosDescanso: number | null;
  marcaciones: MarcacionAsistenciaDto[];
}

export interface AsistenciaDiariaResponseDto extends MiAsistenciaDiariaDto {
  marcaciones: MarcacionAsistenciaResponse[];
}

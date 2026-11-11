export type EstadoCatalogoAsistencia = 'activo' | 'inactivo';

export interface CatalogoAsistenciaEmpleadoDto {
  id: number;
  nombreCompleto: string;
  sedeId: number | null;
  sedeNombre: string | null;
  activo: boolean;
}

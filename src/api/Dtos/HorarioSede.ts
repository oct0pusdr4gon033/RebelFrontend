export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HorarioSedeRequest {
  sedeId: number;
  diaSemana: DiaSemana;
  esLaborable: boolean;
  horaIngreso1: string | null;
  horaSalida1: string | null;
  horaIngreso2: string | null;
  horaSalida2: string | null;
}

export interface HorarioSedeResponse extends HorarioSedeRequest {
  id: number;
}

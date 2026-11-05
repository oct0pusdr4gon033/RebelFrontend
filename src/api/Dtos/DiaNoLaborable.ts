export interface DiaNoLaborableRequest {
  fecha: string;
  sedeId: number | null;
  descripcion: string;
}

export interface DiaNoLaborableResponse extends DiaNoLaborableRequest {
  id: number;
  configuradoPorUserId: string | null;
  creadoEnUtc: string;
}

// ── SEDE DTOs ──────────────────────────────────────────────────────────────────

export interface SedeDto {
  id: number;
  nombre: string;
  ubicacion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  totalEmpleados: number;
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export interface CrearSedeRequest {
  nombre: string;
  ubicacion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface ActualizarSedeRequest {
  nombre: string;
  ubicacion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface EmpleadoDto {
  id: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dni: string;
  cargo: string;
  telefono?: string;
  email?: string;
  fechaIngreso: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;

  // Usuario del sistema vinculado
  userId?: string;
  userEmail?: string;
  userNombre?: string;
  rolNombre?: string;

  // Sede vinculada
  sedeId?: number;
  sedeNombre?: string;
  sedeUbicacion?: string;
  sedeDireccion?: string;
}

export interface CrearEmpleadoRequest {
  nombres: string;
  apellidos: string;
  dni: string;
  cargo: string;
  telefono?: string;
  email?: string;
  fechaIngreso?: string;
  sedeId?: number;
}

export interface ActualizarEmpleadoRequest {
  nombres: string;
  apellidos: string;
  dni: string;
  cargo: string;
  telefono?: string;
  email?: string;
  fechaIngreso?: string;
  sedeId?: number;
}
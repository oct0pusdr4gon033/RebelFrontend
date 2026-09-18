
import type { EmpleadoDto } from './Empleado';
export type { EmpleadoDto };
export interface LoginRequest {
  email: string;
  password: string;
}



export interface LoginResponse {
  token: string;
  expiracion: string;
  empleado: EmpleadoDto;
}



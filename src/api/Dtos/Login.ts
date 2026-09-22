
import type { EmpleadoDto } from './Empleado';
export type { EmpleadoDto };
export interface LoginRequest {
  email: string;
  password: string;
}



export interface LoginResult {
  requiresApproval: boolean;
  attemptId?: string | null;
  message?: string;
  data?: LoginResponse | null;
}

export interface SessionAttemptStatus {
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | string;
  message?: string;
  data?: LoginResponse | null;
}

export interface SessionAlert {
  attemptId: string;
  deviceName: string;
  ipAddress: string;
  timestamp: string;
}

export interface ResolveSessionAttemptRequest {
  attemptId: string;
  approved: boolean;
}



export interface LoginResponse {
  token: string;
  expiracion: string;
  empleado: EmpleadoDto;
}

// ── USUARIO DTOs ───────────────────────────────────────────────────────────────

export interface UsuarioDto {
  id: string;
  email: string;
  userName: string;
  nombreCompleto: string;
  activo: boolean;
  fechaCreacion: string;

  // Rol
  rolId?: string;
  rolNombre?: string;

  // Empleado vinculado
  empleadoId?: number;
  empleadoNombreCompleto?: string;
  empleadoDni?: string;

  // Sede (del empleado)
  sedeId?: number;
  sedeNombre?: string;
}

export interface CrearUsuarioRequest {
  email: string;
  password: string;
  nombreCompleto: string;
  rolId: string;
  empleadoId?: number;
  sedeId?: number;
}

export interface ActualizarUsuarioRequest {
  nombreCompleto: string;
  rolId?: string;
  empleadoId?: number;
  sedeId?: number;
  activo: boolean;
}

export interface RolDto {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

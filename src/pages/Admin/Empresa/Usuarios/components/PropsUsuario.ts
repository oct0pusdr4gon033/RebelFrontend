import type { ActualizarUsuarioRequest, CrearUsuarioRequest, RolDto, UsuarioDto } from "../../../../../api/Dtos/Usuario";
import type { EmpleadoDto } from "../../../../../api/Dtos/Empleado";
import type { SedeDto } from "../../../../../api/Dtos/Sede";

export interface PropsUsuario {
    open: boolean;
    usuario?: UsuarioDto | null;
    roles: RolDto[];
    empleados: EmpleadoDto[];
    sedes: SedeDto[];
    onClose: () => void;
    onSave: (data: CrearUsuarioRequest | ActualizarUsuarioRequest) => Promise<void>;
}
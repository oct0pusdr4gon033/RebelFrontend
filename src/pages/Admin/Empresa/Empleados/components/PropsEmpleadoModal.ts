import type { ActualizarEmpleadoRequest, CrearEmpleadoRequest, EmpleadoDto } from "../../../../../api/Dtos/Empleado";
import type { SedeDto } from "../../../../../api/Dtos/Sede";

export interface PropsEmpleadoModal {
    open: boolean;
    empleado?: EmpleadoDto | null;
    sedes: SedeDto[];
    onClose: () => void;
    onSave: (data: CrearEmpleadoRequest | ActualizarEmpleadoRequest) => Promise<void>;
}
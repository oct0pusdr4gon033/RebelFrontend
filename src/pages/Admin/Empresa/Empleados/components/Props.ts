import type { EmpleadoDto } from "../../../../../api/Dtos/Empleado";

export interface Props {
    empleados: EmpleadoDto[];
    loading: boolean;
    onEdit: (empleado: EmpleadoDto) => void;
    onDelete: (empleado: EmpleadoDto) => void;
    onRestore: (empleado: EmpleadoDto) => void;
}

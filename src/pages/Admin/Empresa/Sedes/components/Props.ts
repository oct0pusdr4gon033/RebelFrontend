import type { ActualizarSedeRequest, CrearSedeRequest, SedeDto } from "../../../../../api/Dtos/Sede";

export interface Props {
    open: boolean;
    sede?: SedeDto | null;   // null = crear, SedeDto = editar
    onClose: () => void;
    onSave: (data: CrearSedeRequest | ActualizarSedeRequest) => Promise<void>;
}

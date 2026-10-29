
import type { Oportunidad } from '../../types/oportunidades';

export interface PodioRequerimientoModalProps {
    numeroRequerimiento: string;
    oportunidades: Oportunidad[];
    roleAccent?: string;
    onClose: () => void;
    onOportunidadesActualizadas?: (ops: Oportunidad[]) => void;
    onVerDetalle?: (op: Oportunidad) => void;
}
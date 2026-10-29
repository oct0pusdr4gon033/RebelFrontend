import type { Oportunidad } from '../../types/oportunidades';

export interface RegistrarOCScreenProps {
    op: Oportunidad;
    roleAccent?: string;
    onBack: () => void;
    onSuccess: (opActualizada: Oportunidad) => void;
}

import type { Oportunidad, VencimientoBadge } from '../types/oportunidades';

export interface ListadoOportunidadesViewProps {
    oportunidades: Oportunidad[];
    roleAccent: string;
    onEdit: (op: Oportunidad) => void;
    onSubirEvidencia: (opId: string | number) => void;
    getVencimientoBadge: (fechaIso: string) => VencimientoBadge | null;
}
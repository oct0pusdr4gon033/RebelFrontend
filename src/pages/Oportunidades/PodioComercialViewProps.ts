
import type { Oportunidad, TipoPodio } from '../../types/oportunidades';

export interface PodioComercialViewProps {
    oportunidades: Oportunidad[];
    roleAccent: string;
    initialTipo?: TipoPodio;
}
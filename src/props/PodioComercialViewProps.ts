

import type { Oportunidad } from '../models/Oportunidad.model';
import type { TipoPodio } from '../models/TipoPodio.model';


export interface PodioComercialViewProps {
    oportunidades: Oportunidad[];
    roleAccent: string;
    initialTipo?: TipoPodio;
}

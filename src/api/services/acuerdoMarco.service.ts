import type { AcuerdoMarco } from '../Dtos/AcuerdoMarco';

import { API_BASE } from '../../env/envoviment';

export const getAcuerdoMarco = async (): Promise<AcuerdoMarco[]> => {
    const response = await fetch(`${API_BASE}/api/acuerdosmarco`);
    if (!response.ok) {
        throw new Error('Error al cargar los acuerdos');
    }
    const data = await response.json();
    return data;
}
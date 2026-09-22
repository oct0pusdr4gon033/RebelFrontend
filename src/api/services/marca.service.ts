import type { Marca } from '../Dtos/Marca';
import { getAuthHeaders } from './oportunidades.service';

import { API_BASE } from '../../env/envoviment';

export const getMarcasApi = async (): Promise<Marca[]> => {
    const response = await fetch(`${API_BASE}/api/marcas`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error('Error al cargar las marcas');
    }
    const data = await response.json();
    return data;
};

import type { PaginatedEmpresas } from '../Dtos/Empresa';
import { getAuthHeaders } from './oportunidades.service';

const API_BASE = 'https://localhost:7010';

export const getEmpresasApi = async (q: string = '', page: number = 1, limit: number = 15): Promise<PaginatedEmpresas> => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE}/api/empresas?${params.toString()}`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error('Error al cargar las empresas');
    }
    const data = await response.json();
    return data;
};

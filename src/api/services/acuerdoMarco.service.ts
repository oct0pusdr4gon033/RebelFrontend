import type { AcuerdoMarco } from '../Dtos/AcuerdoMarco';

const API_BASE = 'https://localhost:7010';

export const getAcuerdoMarco = async (): Promise<AcuerdoMarco[]> => {
    const response = await fetch(`${API_BASE}/api/acuerdosmarco`);
    if (!response.ok) {
        throw new Error('Error al cargar los acuerdos');
    }
    const data = await response.json();
    return data;
}
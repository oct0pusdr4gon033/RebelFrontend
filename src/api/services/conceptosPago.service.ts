// ─────────────────────────────────────────────────────────────────────────────
// src/api/services/conceptosPago.service.ts
// Servicio para consultar y gestionar el catálogo de Conceptos de Pago (API Backend)
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE } from '../../env/envoviment';
import type { ConceptoPagoItem, ConceptoPagoComboItem } from '../../types/pagos';

/**
 * Obtiene la lista completa de conceptos de pago desde el backend.
 * Por defecto solo los activos para uso en selectores y filtros.
 */
export const getConceptosPago = async (soloActivos: boolean = true): Promise<ConceptoPagoItem[]> => {
  const response = await fetch(`${API_BASE}/api/conceptospago?soloActivos=${soloActivos}`);
  if (!response.ok) {
    throw new Error('Error al obtener los conceptos de pago del servidor');
  }
  return response.json();
};

/**
 * Obtiene las opciones en formato Value / Label optimizado para componentes Select / Combobox.
 */
export const getConceptosPagoCombo = async (): Promise<ConceptoPagoComboItem[]> => {
  const response = await fetch(`${API_BASE}/api/conceptospago/combo`);
  if (!response.ok) {
    throw new Error('Error al obtener los conceptos de pago para el combobox');
  }
  return response.json();
};

/**
 * Obtiene un concepto de pago específico por su Id.
 */
export const getConceptoPagoPorId = async (id: number): Promise<ConceptoPagoItem> => {
  const response = await fetch(`${API_BASE}/api/conceptospago/${id}`);
  if (!response.ok) {
    throw new Error(`Error al obtener el concepto de pago #${id}`);
  }
  return response.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// src/types/contactos.ts
// Tipos para el módulo de Agenda de Contactos (Con o Sin OCAM Relacionada y
// soporte para agregar varios contactos en un mismo registro)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoRelacionEmpresa =
  | 'Entidad Solicitante'
  | 'Entidad / Marca de Cotización'
  | 'Relación Exterior';

export interface PersonaContactoItem {
  contactoNumero: string;
  contactoNombre: string;
  contactoAreaCargo?: string;
}

export interface ContactoOCAM {
  id: number | string;
  numeroOCAM: string;
  sinOcamRelacionada?: boolean;
  rucEntidad?: string;
  oportunidadId?: number | null;
  ordenCompraId?: number | null;
  contactoNumero: string;
  contactoNombre: string;
  contactoAreaCargo: string;
  contactoMotivo: string;
  respuesta: string;
  tipoRelacion: TipoRelacionEmpresa;
  empresaRelacionada: string;
  empresaId?: number | null;
  grupoRegistroId?: string | null;
  contactosRegistrados?: PersonaContactoItem[];
  registradoPor: string;
  registradoPorUsuarioId?: string | null;
  fechaRegistro: string;
  esInmutable: boolean;
}

export interface RegistrarContactoInput {
  numeroOCAM?: string;
  sinOcamRelacionada?: boolean;
  rucEntidad?: string;
  oportunidadId?: number | null;
  ordenCompraId?: number | null;
  contactoNumero?: string;
  contactoNombre?: string;
  contactoAreaCargo?: string;
  contactoMotivo?: string;
  respuesta?: string;
  tipoRelacion: TipoRelacionEmpresa;
  empresaRelacionada: string;
  empresaId?: number | null;
  /** Lista de contactos cuando se agregan varios contactos en un mismo registro */
  contactos?: PersonaContactoItem[];
}

export interface FiltroContacto {
  numeroOCAM?: string;
  rucEntidad?: string;
  empresaRelacionada?: string;
  tipoRelacion?: string;
  busqueda?: string;
  casoRespuesta?: 'todos' | 'caso1' | 'caso2' | 'otros';
  modalidadOcam?: 'todos' | 'con_ocam' | 'sin_ocam';
}

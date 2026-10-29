// ─────────────────────────────────────────────────────────────────────────────
// src/api/services/contactos.service.ts
// Servicio para el registro (con o sin OCAM relacionada, individual o múltiple),
// consulta y trazabilidad inmutable de contactos de Entidades y OCAM
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ContactoOCAM,
  RegistrarContactoInput,
  FiltroContacto,
  PersonaContactoItem,
} from '../../types/contactos';
import { API_BASE } from '../../env/envoviment';

const STORAGE_KEY = 'sales_rebel_contactos_ocam_v1';

/** Semillas demostrativas iniciales */
const SEED_CONTACTOS: ContactoOCAM[] = [
  {
    id: 1,
    numeroOCAM: 'OCAM-2026-0001092',
    sinOcamRelacionada: false,
    rucEntidad: '20514347221',
    oportunidadId: 33,
    contactoNumero: '900900900',
    contactoNombre: 'JERRY MEDRANO',
    contactoAreaCargo: 'LOGISTICA - JEFE DE LOGISTICA',
    contactoMotivo: 'SE CONTACTO SOBRE ESTADO EN EL QUE LLEGO EL PRODUCTO',
    respuesta: 'CASO 1: DIJO QUE EL ESTADO DEL PRODUCTO LLEGO EN PERFECTAS CONDICIONES',
    tipoRelacion: 'Entidad Solicitante',
    empresaRelacionada: 'MINISTERIO DE EDUCACIÓN (PRONIED)',
    registradoPor: 'Administradora Operativa',
    registradoPorUsuarioId: 'admin-1',
    fechaRegistro: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    esInmutable: true,
  },
  {
    id: 2,
    numeroOCAM: 'OCAM-2026-0001092',
    sinOcamRelacionada: false,
    rucEntidad: '20514347221',
    oportunidadId: 33,
    contactoNumero: '988776655',
    contactoNombre: 'CARLOS VILLACORTA',
    contactoAreaCargo: 'ALMACÉN CENTRAL - RECEPCIÓN',
    contactoMotivo: 'CONFIRMACIÓN DE GUÍA DE REMISIÓN Y SELLADO DE CONFORMIDAD',
    respuesta: 'CASO 2: NO CONTESTO TELEFONO',
    tipoRelacion: 'Entidad Solicitante',
    empresaRelacionada: 'MINISTERIO DE EDUCACIÓN (PRONIED)',
    registradoPor: 'Ejecutiva de Ventas',
    registradoPorUsuarioId: 'ejec-1',
    fechaRegistro: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
    esInmutable: true,
  },
  {
    id: 3,
    numeroOCAM: 'SIN OCAM',
    sinOcamRelacionada: true,
    rucEntidad: '20131370998',
    contactoNumero: '945112233',
    contactoNombre: 'LUCÍA FERNÁNDEZ',
    contactoAreaCargo: 'ABASTECIMIENTO - ESPECIALISTA DE COMPRAS',
    contactoMotivo: 'REGISTRO DIRECTO DE CONTACTO DE ENTIDAD (SIN OCAM RELACIONADA)',
    respuesta: 'CONTACTO REGISTRADO EN DIRECTORIO DE ENTIDAD',
    tipoRelacion: 'Entidad Solicitante',
    empresaRelacionada: 'GOBIERNO REGIONAL DE LIMA',
    grupoRegistroId: 'GRP-DEMO-01',
    contactosRegistrados: [
      {
        contactoNumero: '945112233',
        contactoNombre: 'LUCÍA FERNÁNDEZ',
        contactoAreaCargo: 'ABASTECIMIENTO - ESPECIALISTA DE COMPRAS',
      },
      {
        contactoNumero: '945998877',
        contactoNombre: 'MIGUEL ÁNGEL TORRES',
        contactoAreaCargo: 'ALMACÉN GENERAL - JEFE DE RECEPCIÓN',
      },
    ],
    registradoPor: 'Ejecutiva de Ventas',
    registradoPorUsuarioId: 'ejec-1',
    fechaRegistro: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    esInmutable: true,
  },
];

/** Lee contactos del almacenamiento local seguro */
function leerLocalStorage(): ContactoOCAM[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONTACTOS));
      return SEED_CONTACTOS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_CONTACTOS;
  } catch {
    return SEED_CONTACTOS;
  }
}

/** Guarda contactos en el almacenamiento local seguro */
function guardarLocalStorage(lista: ContactoOCAM[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch (err) {
    console.error('Error al persistir contactos en localStorage:', err);
  }
}

/**
 * Obtiene el listado completo de la agenda de contactos con filtros aplicados.
 */
export async function getContactosApi(filtro?: FiltroContacto): Promise<ContactoOCAM[]> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const queryParams = new URLSearchParams();
  if (filtro?.numeroOCAM) queryParams.set('numeroOCAM', filtro.numeroOCAM);
  if (filtro?.rucEntidad) queryParams.set('rucEntidad', filtro.rucEntidad);
  if (filtro?.empresaRelacionada) queryParams.set('empresaRelacionada', filtro.empresaRelacionada);
  if (filtro?.tipoRelacion && filtro.tipoRelacion !== 'todos')
    queryParams.set('tipoRelacion', filtro.tipoRelacion);
  if (filtro?.busqueda) queryParams.set('busqueda', filtro.busqueda);

  const url = `${API_BASE}/api/contactos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const locales = leerLocalStorage();
        const idsBackend = new Set(data.map((d: ContactoOCAM) => String(d.id)));
        const soloLocales = locales.filter((l) => !idsBackend.has(String(l.id)) && Number(l.id) > 100000);
        const combinados = [...data, ...soloLocales];
        guardarLocalStorage(combinados);
        return combinados;
      }
    }
  } catch (err) {
    console.warn('Backend API de contactos no disponible, usando caché local:', err);
  }

  let contactos = leerLocalStorage();

  if (filtro?.numeroOCAM) {
    contactos = contactos.filter((c) =>
      c.numeroOCAM.toLowerCase().includes(filtro.numeroOCAM!.toLowerCase().trim())
    );
  }

  if (filtro?.rucEntidad) {
    contactos = contactos.filter((c) =>
      (c.rucEntidad || '').toLowerCase().includes(filtro.rucEntidad!.toLowerCase().trim())
    );
  }

  if (filtro?.empresaRelacionada) {
    contactos = contactos.filter((c) =>
      c.empresaRelacionada.toLowerCase().includes(filtro.empresaRelacionada!.toLowerCase().trim())
    );
  }

  if (filtro?.tipoRelacion && filtro.tipoRelacion !== 'todos') {
    contactos = contactos.filter((c) => c.tipoRelacion === filtro.tipoRelacion);
  }

  if (filtro?.busqueda) {
    const q = filtro.busqueda.toLowerCase().trim();
    contactos = contactos.filter(
      (c) =>
        c.numeroOCAM.toLowerCase().includes(q) ||
        (c.rucEntidad || '').toLowerCase().includes(q) ||
        c.contactoNombre.toLowerCase().includes(q) ||
        c.contactoNumero.includes(q) ||
        c.contactoAreaCargo.toLowerCase().includes(q) ||
        c.empresaRelacionada.toLowerCase().includes(q) ||
        c.contactoMotivo.toLowerCase().includes(q) ||
        c.respuesta.toLowerCase().includes(q)
    );
  }

  if (filtro?.casoRespuesta && filtro.casoRespuesta !== 'todos') {
    if (filtro.casoRespuesta === 'caso1') {
      contactos = contactos.filter(
        (c) =>
          c.respuesta.toUpperCase().includes('CASO 1') ||
          c.respuesta.toLowerCase().includes('perfectas')
      );
    } else if (filtro.casoRespuesta === 'caso2') {
      contactos = contactos.filter(
        (c) =>
          c.respuesta.toUpperCase().includes('CASO 2') ||
          c.respuesta.toLowerCase().includes('no contesto') ||
          c.respuesta.toLowerCase().includes('no contestó')
      );
    } else if (filtro.casoRespuesta === 'otros') {
      contactos = contactos.filter(
        (c) =>
          !c.respuesta.toUpperCase().includes('CASO 1') &&
          !c.respuesta.toUpperCase().includes('CASO 2')
      );
    }
  }

  return contactos;
}

/**
 * Registra uno o varios contactos en una sola operación (con o sin número de OCAM relacionada).
 */
export async function crearContactosLoteApi(
  data: RegistrarContactoInput,
  usuarioNombre?: string,
  usuarioId?: string
): Promise<ContactoOCAM[]> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const listaItems: PersonaContactoItem[] =
    data.contactos && data.contactos.length > 0
      ? data.contactos.filter((c) => c.contactoNombre.trim() && c.contactoNumero.trim())
      : [
          {
            contactoNumero: (data.contactoNumero || '').trim(),
            contactoNombre: (data.contactoNombre || '').trim(),
            contactoAreaCargo: (data.contactoAreaCargo || '').trim(),
          },
        ];

  const sinOcam = Boolean(data.sinOcamRelacionada || !data.numeroOCAM || !data.numeroOCAM.trim());
  const numeroOcamFinal = sinOcam ? 'SIN OCAM' : data.numeroOCAM!.trim().toUpperCase();
  const rucFinal = (data.rucEntidad || '').trim();
  const motivoFinal = (
    data.contactoMotivo?.trim() ||
    (sinOcam
      ? 'REGISTRO DIRECTO DE CONTACTO DE ENTIDAD (SIN OCAM RELACIONADA)'
      : 'SEGUIMIENTO Y COORDINACIÓN DE ORDEN DE COMPRA')
  );
  const respuestaFinal = (
    data.respuesta?.trim() || 'CONTACTO REGISTRADO EN DIRECTORIO DE ENTIDAD'
  );

  const payload = {
    ...data,
    numeroOCAM: numeroOcamFinal,
    sinOcamRelacionada: sinOcam,
    rucEntidad: rucFinal || undefined,
    contactoNumero: listaItems[0]?.contactoNumero || '',
    contactoNombre: listaItems[0]?.contactoNombre || '',
    contactoAreaCargo: listaItems[0]?.contactoAreaCargo || 'CONTACTO DE ENTIDAD',
    contactoMotivo: motivoFinal,
    respuesta: respuestaFinal,
    contactos: listaItems,
  };

  try {
    const response = await fetch(`${API_BASE}/api/contactos/lote`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const creadosBackend: ContactoOCAM[] = await response.json();
      if (Array.isArray(creadosBackend) && creadosBackend.length > 0) {
        const actual = leerLocalStorage();
        const nuevosIds = new Set(creadosBackend.map((c) => String(c.id)));
        guardarLocalStorage([
          ...creadosBackend,
          ...actual.filter((c) => !nuevosIds.has(String(c.id))),
        ]);
        return creadosBackend;
      }
    }
  } catch (err) {
    console.warn('Backend API /api/contactos/lote no disponible, registrando localmente:', err);
  }

  // Fallback local seguro: crea un registro inmutable por cada contacto de la lista
  const ahoraIso = new Date().toISOString();
  const grupoId =
    listaItems.length > 1
      ? `GRP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      : null;

  const nuevosLocales: ContactoOCAM[] = listaItems.map((item, idx) => ({
    id: Date.now() + idx,
    numeroOCAM: numeroOcamFinal,
    sinOcamRelacionada: sinOcam,
    rucEntidad: rucFinal || undefined,
    oportunidadId: sinOcam ? null : data.oportunidadId,
    ordenCompraId: sinOcam ? null : data.ordenCompraId,
    contactoNumero: item.contactoNumero.trim(),
    contactoNombre: item.contactoNombre.trim().toUpperCase(),
    contactoAreaCargo: (item.contactoAreaCargo || 'CONTACTO DE ENTIDAD').trim().toUpperCase(),
    contactoMotivo: motivoFinal,
    respuesta: respuestaFinal,
    tipoRelacion: data.tipoRelacion,
    empresaRelacionada: data.empresaRelacionada.trim(),
    empresaId: data.empresaId,
    grupoRegistroId: grupoId,
    contactosRegistrados: listaItems.length > 1 ? listaItems : undefined,
    registradoPor: usuarioNombre || 'Usuario del Sistema',
    registradoPorUsuarioId: usuarioId || null,
    fechaRegistro: ahoraIso,
    esInmutable: true,
  }));

  const actual = leerLocalStorage();
  guardarLocalStorage([...nuevosLocales, ...actual]);

  return nuevosLocales;
}

/**
 * Registra un contacto (mantiene compatibilidad devolviendo el primero creado).
 */
export async function crearContactoApi(
  data: RegistrarContactoInput,
  usuarioNombre?: string,
  usuarioId?: string
): Promise<ContactoOCAM> {
  const creados = await crearContactosLoteApi(data, usuarioNombre, usuarioId);
  return creados[0];
}

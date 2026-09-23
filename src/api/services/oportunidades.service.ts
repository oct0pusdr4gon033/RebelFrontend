import { API_BASE } from '../../env/envoviment';

export function getAuthToken(): string | null {
  // 1. Verificar si hay token directo
  const directToken = localStorage.getItem('token');
  if (directToken) return directToken;

  // 2. Extraer desde el estado de sesión de AuthContext ('rq_auth')
  try {
    const rqAuth = localStorage.getItem('rq_auth');
    if (rqAuth) {
      const parsed = JSON.parse(rqAuth);
      if (parsed?.token) return parsed.token;
    }
  } catch {
    // ignore
  }

  // 3. Fallback por si estuviera en sessionStorage
  try {
    const sessionAuth = sessionStorage.getItem('rq_auth') || sessionStorage.getItem('token');
    if (sessionAuth) {
      if (sessionAuth.startsWith('{')) {
        const parsed = JSON.parse(sessionAuth);
        if (parsed?.token) return parsed.token;
      }
      return sessionAuth;
    }
  } catch {
    // ignore
  }

  return null;
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ProductoItemPayload {
  id?: number;
  numeroParte: string;
  descripcion?: string;
  cantidad: number;
  limiteUnitario: number;
  limiteSubtotal?: number;
  fichaProducto?: string | null;
  marcaProducto?: string | null;
  moneda?: string | null;
  precioUnitarioBase?: number | null;
  precioUnitarioOfertado?: number | null;
  condicionesAdicionales?: string | null;
  fichaTecnica?: string | null;
}

export interface CrearOportunidadApiRequest {
  numeroRequerimiento: string;
  acuerdoMarcoId: number;  // Backend: int
  fechaVencimientoLicitacion?: string | null;  // Backend: DateTime? (nullable)
  empresaId?: number | null;
  entidadConvocante?: string;
  marcaIds: number[];  // Backend: List<int>
  productos: ProductoItemPayload[];
}

export interface ActualizarOportunidadApiRequest {
  empresaId?: number | null;
  entidadConvocante?: string;
  marcaIds: number[];  // Backend: List<int>
  productos: ProductoItemPayload[];
}

export interface OportunidadApiResponse {
  id: number;
  numeroRequerimiento: string;
  acuerdoMarcoId: number;
  acuerdoMarcoCodigo?: string;
  acuerdoMarcoDescripcion?: string;
  fechaVencimientoLicitacion: string;
  empresaId?: number;
  empresaRazonSocial?: string;
  empresaRuc?: string;
  entidadConvocante?: string;
  marcas: { id: number; nombre: string }[];
  productos: {
    id: number;
    numeroParte: string;
    descripcion?: string;
    cantidad: number;
    limiteUnitario: number;
    limiteSubtotal: number;
    fichaProducto?: string | null;
    marcaProducto?: string | null;
    moneda?: string | null;
    precioUnitarioBase?: number | null;
    precioUnitarioOfertado?: number | null;
    condicionesAdicionales?: string | null;
    fichaTecnica?: string | null;
  }[];
  limiteTotal: number;
  estado: string;
  ordenCompra?: OrdenCompraApiResponse | null;
  creadoPorUsuarioId?: string;
  creadoPorNombre?: string;
  fechaRegistro: string;
  fechaActualizacion?: string;
}

export interface OrdenCompraApiResponse {
  id: number;
  oportunidadId: number;
  numeroOC: string;
  fechaEmisionOC?: string | null;
  estadoOC: string;
  motivoRechazo?: string | null;
  fechaDecisionOC?: string | null;
  costoInicial?: number | null;
  costoRenegociado?: number | null;
  margenAdicional?: number | null;
  fechaRenegociacion?: string | null;
  fechaDespacho?: string | null;
  transportista?: string | null;
  noGuiaRemision?: string | null;
  fechaEntrega?: string | null;
  fechaRegistro: string;
  fechaActualizacion?: string | null;
}

/**
 * Obtener todas las oportunidades
 */
export async function getOportunidadesApi(): Promise<OportunidadApiResponse[]> {
  const response = await fetch(`${API_BASE}/api/oportunidades`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener oportunidades');
  return response.json();
}

/**
 * Obtener marcas disponibles
 */
export async function getMarcasApi() {
  const response = await fetch(`${API_BASE}/api/marcas`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener marcas');
  return response.json();
}

/**
 * Obtener acuerdos marco disponibles
 */
export async function getAcuerdosMarcoApi() {
  const response = await fetch(`${API_BASE}/api/acuerdosmarco`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener acuerdos marco');
  return response.json();
}

/**
 * Obtener empresas disponibles
 */
export async function getEmpresasApi() {
  const response = await fetch(`${API_BASE}/api/empresas`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener empresas');
  return response.json();
}

/**
 * Crear nueva oportunidad (Registro Rápido)
 */
export async function createOportunidadApi(data: CrearOportunidadApiRequest): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    let errMsg = `Error ${response.status}`;
    try {
      const err = await response.json();
      console.error('[createOportunidadApi] Error response body:', err);
      // ASP.NET Core application error: { mensaje: '...' }
      if (err?.mensaje) {
        errMsg = err.mensaje;
      // ASP.NET Core ModelState: { errors: { field: ['msg'] } } or { title: '...', errors: {...} }
      } else if (err?.errors) {
        // Ignorar la clave genérica 'dto' si existen errores específicos de campos
        const specificKeys = Object.keys(err.errors).filter((k) => k !== 'dto' && k !== '$');
        if (specificKeys.length > 0) {
          const key = specificKeys[0];
          const cleanKey = key.replace(/^\$\./, '');
          errMsg = `${cleanKey}: ${err.errors[key]?.[0] ?? 'Inválido'}`;
        } else if (err.errors['$']?.[0]) {
          errMsg = err.errors['$'][0];
        } else {
          const firstKey = Object.keys(err.errors)[0];
          errMsg = err.errors[firstKey]?.[0] ?? err.title ?? 'Error de validación';
        }
      } else if (err?.title) {
        errMsg = err.title;
      }
    } catch {
      // no-op
    }
    throw new Error(errMsg);
  }
  return response.json();
}

/**
 * Actualizar Oportunidad
 * REGLA DE NEGOCIO:
 * 1. Convocatoria Perú Compras NO se edita.
 * 2. Empresa, Marcas y Productos/Límites SÍ se editan.
 */
export async function updateOportunidadApi(
  id: number | string,
  data: ActualizarOportunidadApiRequest
): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ mensaje: 'Error al actualizar oportunidad' }));
    throw new Error(err.mensaje ?? 'Error en la actualización');
  }
  return response.json();
}
/**
 * Cambiar estado de una oportunidad
 * Solo la ejecutiva que registró la oportunidad puede cambiar su estado.
 */
export async function cambiarEstadoApi(
  id: number | string,
  estado: string
): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades/${id}/estado`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ estado }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ mensaje: 'Error al cambiar estado' }));
    throw new Error(err.mensaje ?? 'Error en el cambio de estado');
  }
  return response.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// BLOQUE 2: ÓRDENES DE COMPRA Y OPERACIONES (OC & Logística)
// ═════════════════════════════════════════════════════════════════════════════

export interface RegistrarOCRequest {
  numeroOC: string;
  fechaEmisionOC?: string | null;
}

export interface CambiarEstadoOCRequest {
  estadoOC: 'OC_ACEPTADA' | 'OC_RECHAZADA';
  motivoRechazo?: string | null;
}

export interface RenegociarCostoRequest {
  costoInicial: number;
  costoRenegociado: number;
}

export interface RegistrarEntregaRequest {
  fechaDespacho?: string | null;
  transportista?: string | null;
  noGuiaRemision?: string | null;
  fechaEntrega?: string | null;
}

async function erroresApi(response: Response, fallback: string): Promise<string> {
  let errMsg = `Error ${response.status}`;
  try {
    const err = await response.json();
    if (err?.mensaje) errMsg = err.mensaje;
    else if (err?.errors) {
      const specificKeys = Object.keys(err.errors).filter((k) => k !== 'dto' && k !== '$');
      if (specificKeys.length > 0) {
        const key = specificKeys[0];
        errMsg = `${key.replace(/^\$\./, '')}: ${err.errors[key]?.[0] ?? 'Inválido'}`;
      } else if (err.errors['$']?.[0]) errMsg = err.errors['$'][0];
      else errMsg = err.title ?? fallback;
    } else if (err?.title) errMsg = err.title;
  } catch {
    // no-op
  }
  return errMsg || fallback;
}

export async function registrarOCApi(
  id: number | string,
  data: RegistrarOCRequest
): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades/${id}/oc`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await erroresApi(response, 'Error al registrar la Orden de Compra'));
  return response.json();
}

export async function cambiarEstadoOCApi(
  id: number | string,
  data: CambiarEstadoOCRequest
): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades/${id}/oc/estado`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await erroresApi(response, 'Error al actualizar la Orden de Compra'));
  return response.json();
}

export async function renegociarCostoApi(
  id: number | string,
  data: RenegociarCostoRequest
): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades/${id}/oc/costo`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await erroresApi(response, 'Error al renegociar el costo'));
  return response.json();
}

export async function registrarEntregaApi(
  id: number | string,
  data: RegistrarEntregaRequest
): Promise<OportunidadApiResponse> {
  const response = await fetch(`${API_BASE}/api/oportunidades/${id}/entregas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await erroresApi(response, 'Error al registrar la entrega'));
  return response.json();
}

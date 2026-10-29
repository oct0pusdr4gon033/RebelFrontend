import type { DocumentoOCItem, Oportunidad } from '../types/oportunidades';

// ─────────────────────────────────────────────────────────────────────────────
// INDEXEDDB HELPER (Soporta gigabytes de almacenamiento sin límite de 5MB)
// ─────────────────────────────────────────────────────────────────────────────
const DB_NAME = 'RebelDocsDB';
const DB_VERSION = 1;
const STORE_NAME = 'oc_documents';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no soportado en este entorno'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'opId' });
      }
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

/** Guarda el pool de documentos completo (incluyendo Base64/DataURLs pesados) en IndexedDB */
export async function guardarEnIndexedDB(opId: string | number, pool: DocumentoOCItem[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ opId: String(opId), pool, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[guardarEnIndexedDB] No se pudo guardar en IndexedDB:', err);
  }
}

/** Recupera el pool de documentos completo desde IndexedDB */
export async function obtenerDeIndexedDB(opId: string | number): Promise<DocumentoOCItem[] | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(opId));
      req.onsuccess = () => {
        resolve(req.result?.pool || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHÉ EN MEMORIA (Inmediata y síncrona para la sesión activa)
// ─────────────────────────────────────────────────────────────────────────────
const inMemoryCache = new Map<string, DocumentoOCItem[]>();

/**
 * Obtiene el pool de documentos asociados a una Orden de Compra de una Oportunidad.
 * Busca primero en memoria, luego en la OC, luego en metadatos y respaldo histórico.
 */
export function obtenerPoolDocumentosOC(op?: Oportunidad | null): DocumentoOCItem[] {
  if (!op) return [];
  const key = String(op.id);

  // 1. Revisar caché en memoria activa
  if (inMemoryCache.has(key)) {
    const cached = inMemoryCache.get(key);
    if (cached && cached.length > 0) return cached;
  }

  // 2. Si la orden de compra ya tiene documentos en memoria
  if (
    op.ordenCompra?.documentosPool &&
    Array.isArray(op.ordenCompra.documentosPool) &&
    op.ordenCompra.documentosPool.length > 0
  ) {
    inMemoryCache.set(key, op.ordenCompra.documentosPool);
    return op.ordenCompra.documentosPool;
  }

  // 3. Revisar almacenamiento local de metadatos
  try {
    const raw = localStorage.getItem(`rebel_oc_docs_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // 4. Respaldo histórico de un solo archivo
  if (op.ordenCompra?.archivoOCUrl) {
    const legacy: DocumentoOCItem[] = [
      {
        id: `legacy-${op.id}-1`,
        url: op.ordenCompra.archivoOCUrl,
        nombre: op.ordenCompra.archivoNombre || 'Orden_de_Compra_Oficial.pdf',
        tipo: 'application/pdf',
        tamanoTexto: 'Documento original',
        fechaSubida: op.ordenCompra.fechaRegistro || new Date().toISOString(),
      },
    ];
    inMemoryCache.set(key, legacy);
    return legacy;
  }

  return [];
}

/**
 * Carga de forma asíncrona el pool desde IndexedDB si los datos en memoria o
 * localStorage carecían de los DataURLs completos.
 */
export async function cargarPoolCompletoAsync(
  opId: string | number
): Promise<DocumentoOCItem[] | null> {
  const key = String(opId);
  const guardadoDB = await obtenerDeIndexedDB(key);
  if (guardadoDB && guardadoDB.length > 0) {
    inMemoryCache.set(key, guardadoDB);
    return guardadoDB;
  }
  return null;
}

/**
 * Persiste el pool de documentos sin exceder la cuota de localStorage.
 * - En memoria e IndexedDB se guarda el pool COMPLETO con DataURLs/archivos pesados.
 * - En localStorage se guardan únicamente los metadatos ligeros (sin strings Base64 gigantes),
 *   eliminando permanentemente el QuotaExceededError.
 */
export function guardarPoolDocumentosOC(opId: string | number, pool: DocumentoOCItem[]): void {
  const key = String(opId);

  // 1. Guardar en memoria activa
  inMemoryCache.set(key, pool);

  // 2. Guardar en IndexedDB (sin límite de 5MB)
  guardarEnIndexedDB(opId, pool);

  // 3. Guardar en localStorage sólo metadatos ligeros para evitar QuotaExceededError
  try {
    // Remover primero la clave previa para liberar espacio inmediatamente
    localStorage.removeItem(`rebel_oc_docs_${key}`);
    const poolLigero = pool.map((doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      tamanoBytes: doc.tamanoBytes,
      tamanoTexto: doc.tamanoTexto,
      tipo: doc.tipo,
      fechaSubida: doc.fechaSubida,
      // Omitir DataURLs en base64 en localStorage (resguardados en IndexedDB y memoria)
      url: doc.url && doc.url.startsWith('data:') ? '' : doc.url,
    }));
    localStorage.setItem(`rebel_oc_docs_${key}`, JSON.stringify(poolLigero));
  } catch (_err) {
    // Si localStorage está al límite por otros elementos de la app, limpiar claves viejas
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('rebel_oc_docs_') && k !== `rebel_oc_docs_${key}`) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Convierte un FileList o arreglo de File en items para el pool de documentos.
 */
export async function procesarArchivosParaPool(files: FileList | File[]): Promise<DocumentoOCItem[]> {
  const lista = Array.from(files);
  const items: DocumentoOCItem[] = [];

  for (const file of lista) {
    const tamanoKb = file.size / 1024;
    const tamanoTexto =
      tamanoKb > 1024
        ? `${(tamanoKb / 1024).toFixed(2)} MB`
        : `${Math.round(tamanoKb)} KB`;

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    let tipo = file.type;
    if (!tipo) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') tipo = 'application/pdf';
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) tipo = `image/${ext}`;
      else tipo = 'application/octet-stream';
    }

    items.push({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: dataUrl,
      nombre: file.name,
      tamanoBytes: file.size,
      tamanoTexto,
      tipo,
      fechaSubida: new Date().toISOString(),
    });
  }

  return items;
}

/**
 * Retorna el ícono y color visual según la extensión o mime type del documento.
 */
export function getDocumentoVisualProps(nombre: string, tipo?: string): {
  icon: string;
  color: string;
  badgeBg: string;
} {
  const ext = nombre.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || tipo?.includes('pdf')) {
    return { icon: 'picture_as_pdf', color: '#dc2626', badgeBg: '#fee2e2' };
  }
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || tipo?.includes('image')) {
    return { icon: 'image', color: '#2563eb', badgeBg: '#dbeafe' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || tipo?.includes('sheet') || tipo?.includes('excel')) {
    return { icon: 'table_view', color: '#059669', badgeBg: '#d1fae5' };
  }
  if (['doc', 'docx'].includes(ext) || tipo?.includes('word')) {
    return { icon: 'description', color: '#4f46e5', badgeBg: '#e0e7ff' };
  }
  return { icon: 'attach_file', color: '#475569', badgeBg: '#f1f5f9' };
}

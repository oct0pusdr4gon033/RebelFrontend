// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useOportunidades.ts
// Hook centralizado con toda la lógica de negocio del módulo Oportunidades
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  getOportunidadesApi,
  createOportunidadApi,
  updateOportunidadApi,
  getAcuerdosMarcoApi,
  getMarcasApi,
  getEmpresasApi,
} from '../api/services/oportunidades.service';
import type {
  Oportunidad,
  AcuerdoMarco,
  Marca,
  EmpresaOption,
  ProductoItem,
  VencimientoBadge,
} from '../types/oportunidades';

const LS_KEY = 'sales_rebel_oportunidades';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Mapea la respuesta de la API al modelo local de Oportunidad */
function mapApiToOportunidad(op: any): Oportunidad {
  return {
    id: op.id,
    numeroRequerimiento: op.numeroRequerimiento,
    acuerdoMarco: {
      id: op.acuerdoMarcoId,
      codigo: op.acuerdoMarcoCodigo || 'N/A',
      descripcion: op.acuerdoMarcoDescripcion || '',
      activo: true,
    },
    empresaId: op.empresaId,
    empresaRazonSocial: op.empresaRazonSocial,
    empresaRuc: op.empresaRuc,
    entidadConvocante: op.entidadConvocante,
    marcas: (op.marcas ?? []).map((m: any) => ({ id: m.id, nombre: m.nombre })),
    fechaVencimiento: op.fechaVencimientoLicitacion,
    items: (op.productos ?? []).map((p: any) => ({
      id: p.id,
      numeroParte: p.numeroParte,
      descripcion: p.descripcion || '',
      cantidad: p.cantidad,
      limiteUnitario: p.limiteUnitario,
    })),
    limiteTotal: op.limiteTotal,
    estado: (op.estado as Oportunidad['estado']) || 'En Licitación',
    creadoPor: op.creadoPorNombre || 'Ejecutiva',
    createdAt: new Date(op.fechaRegistro).toLocaleString('es-PE'),
    fechaRegistro: op.fechaRegistro,
    updatedAt: op.fechaActualizacion
      ? new Date(op.fechaActualizacion).toLocaleString('es-PE')
      : undefined,
  };
}

/** Calcula el badge de vencimiento dado un string de fecha */
export function getVencimientoBadge(dateStr: string): VencimientoBadge | null {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs < 0) return { label: 'Vencida', color: '#ef4444', bg: '#fee2e2' };
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24)
    return { label: `Vence hoy (${diffHours}h)`, color: '#d97706', bg: '#fef3c7' };
  const diffDays = Math.floor(diffHours / 24);
  return { label: `En ${diffDays} días`, color: '#059669', bg: '#d1fae5' };
}

const ITEM_INICIAL: ProductoItem = {
  id: 'item-1',
  numeroParte: '',
  descripcion: '',
  cantidad: 1,
  limiteUnitario: 70,
};

// ── Hook Principal ────────────────────────────────────────────────────────────
export function useOportunidades(creadoPorLabel: string) {
  // ── Catálogos remotos
  const [acuerdosMarco, setAcuerdosMarco] = useState<AcuerdoMarco[]>([]);
  const [loadingAcuerdos, setLoadingAcuerdos] = useState(true);
  const [errorAcuerdos, setErrorAcuerdos] = useState<string | null>(null);

  const [catalogoMarcas, setCatalogoMarcas] = useState<Marca[]>([]);
  const [catalogoEmpresas, setCatalogoEmpresas] = useState<EmpresaOption[]>([]);

  // ── Lista de oportunidades (local + backend)
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // ── Estado del formulario
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [numeroRequerimiento, setNumeroRequerimiento] = useState('');
  const [selectedAcuerdo, setSelectedAcuerdo] = useState<AcuerdoMarco | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaOption | null>(null);
  const [entidadConvocante, setEntidadConvocante] = useState('');
  const [selectedMarcas, setSelectedMarcas] = useState<Marca[]>([]);
  const [items, setItems] = useState<ProductoItem[]>([{ ...ITEM_INICIAL }]);

  // ── UI / Feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Persistencia local ───────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(oportunidades));
  }, [oportunidades]);

  // ── Carga de Acuerdos Marco ──────────────────────────────────────────────
  const loadAcuerdosMarco = useCallback(async () => {
    setLoadingAcuerdos(true);
    setErrorAcuerdos(null);
    try {
      const data = await getAcuerdosMarcoApi();
      if (Array.isArray(data)) {
        setAcuerdosMarco(
          data.map((a: any) => ({
            id: a.id,
            codigo: a.codigo ?? '',
            descripcion: a.descripcion || a.descipcion || 'Sin descripción',
            activo: a.activo ?? true,
          }))
        );
      }
    } catch {
      setErrorAcuerdos('No se pudo conectar con el catálogo de Acuerdos Marco.');
    } finally {
      setLoadingAcuerdos(false);
    }
  }, []);

  // ── Carga de Marcas desde la API ─────────────────────────────────────────
  const loadMarcas = useCallback(async () => {
    try {
      const data = await getMarcasApi();
      if (Array.isArray(data)) {
        setCatalogoMarcas(data.map((m: any) => ({ id: m.id, nombre: m.nombre })));
      }
    } catch {
      // Sin marcas del backend: quedará vacío (el componente puede mostrar mensaje)
    }
  }, []);

  // ── Carga de Empresas desde la API ───────────────────────────────────────
  const loadEmpresas = useCallback(async () => {
    try {
      const data = await getEmpresasApi();
      if (Array.isArray(data)) {
        setCatalogoEmpresas(
          data.map((e: any) => ({
            id: e.id,
            ruc: e.ruc,
            razonSocial: e.razonSocial,
            nombreComercial: e.nombreComercial,
          }))
        );
      }
    } catch {
      // Sin empresas del backend
    }
  }, []);

  // ── Carga de Oportunidades desde el backend ──────────────────────────────
  const loadOportunidades = useCallback(async () => {
    try {
      const data = await getOportunidadesApi();
      if (Array.isArray(data) && data.length > 0) {
        setOportunidades(data.map(mapApiToOportunidad));
      }
    } catch {
      // Backend no disponible: usa estado local
    }
  }, []);

  // ── Inicialización ───────────────────────────────────────────────────────
  useEffect(() => {
    loadAcuerdosMarco();
    loadMarcas();
    loadEmpresas();
    loadOportunidades();
  }, [loadAcuerdosMarco, loadMarcas, loadEmpresas, loadOportunidades]);

  // ── Helpers de Formulario ────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setEditingId(null);
    setNumeroRequerimiento('');
    setSelectedAcuerdo(null);
    setFechaVencimiento('');
    setSelectedEmpresa(null);
    setEntidadConvocante('');
    setSelectedMarcas([]);
    setItems([{ id: `item-${Date.now()}`, numeroParte: '', descripcion: '', cantidad: 1, limiteUnitario: 70 }]);
  }, []);

  const handleStartEdit = useCallback(
    (op: Oportunidad, empresasCatalogo: EmpresaOption[]) => {
      setEditingId(op.id);
      setNumeroRequerimiento(op.numeroRequerimiento);
      setSelectedAcuerdo(op.acuerdoMarco);
      setFechaVencimiento(op.fechaVencimiento);
      if (op.empresaId) {
        setSelectedEmpresa(
          empresasCatalogo.find((e) => e.id === op.empresaId) || {
            id: op.empresaId as number,
            ruc: op.empresaRuc || '',
            razonSocial: op.empresaRazonSocial || '',
          }
        );
      } else {
        setSelectedEmpresa(null);
      }
      setEntidadConvocante(op.entidadConvocante || '');
      setSelectedMarcas(op.marcas);
      setItems(op.items.map((it: ProductoItem) => ({ ...it })));
      setSuccessMsg(null);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    },
    []
  );

  // ── Manejo de Marcas ─────────────────────────────────────────────────────
  const handleSelectMarca = useCallback((marca: Marca) => {
    setSelectedMarcas((prev) => [...prev, marca]);
  }, []);

  const handleRemoveMarca = useCallback((marcaId: string | number) => {
    setSelectedMarcas((prev) => prev.filter((m) => m.id !== marcaId));
  }, []);

  // ── Manejo de Ítems ──────────────────────────────────────────────────────
  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, numeroParte: '', descripcion: '', cantidad: 1, limiteUnitario: 0 },
    ]);
  }, []);

  const handleRemoveItem = useCallback((id: string | number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const handleUpdateItem = useCallback(
    (id: string | number, field: keyof ProductoItem, val: any) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
    },
    []
  );

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const totalCantidad = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  const totalLimite = items.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0),
    0
  );

  const isFormValid =
    numeroRequerimiento.trim().length > 0 &&
    selectedAcuerdo !== null &&
    fechaVencimiento !== '' &&
    selectedMarcas.length > 0 &&
    items.every(
      (it) =>
        (it.numeroParte.trim() || it.descripcion.trim()) &&
        it.cantidad > 0 &&
        it.limiteUnitario > 0
    );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid || !selectedAcuerdo) return;
      setLoading(true);

      const productosPayload = items.map((it) => ({
        numeroParte: it.numeroParte.trim(),
        descripcion: it.descripcion?.trim() || undefined,
        cantidad: Number(it.cantidad),
        limiteUnitario: Number(it.limiteUnitario),
      }));

      try {
        if (editingId) {
          // ── ACTUALIZACIÓN ────────────────────────────────────────────────
          try {
            await updateOportunidadApi(editingId, {
              empresaId: selectedEmpresa ? selectedEmpresa.id : null,
              entidadConvocante: entidadConvocante.trim() || undefined,
              marcaIds: selectedMarcas.map((m) => Number(m.id)),
              productos: productosPayload,
            });
          } catch {
            // Fallback a local
          }

          setOportunidades((prev) =>
            prev.map((op) => {
              if (op.id !== editingId) return op;
              return {
                ...op,
                empresaId: selectedEmpresa ? selectedEmpresa.id : undefined,
                empresaRazonSocial: selectedEmpresa?.razonSocial,
                empresaRuc: selectedEmpresa?.ruc,
                entidadConvocante: entidadConvocante.trim() || undefined,
                marcas: selectedMarcas,
                items: items.map((it) => ({ ...it })),
                limiteTotal: totalLimite,
                updatedAt: new Date().toLocaleString('es-PE'),
              };
            })
          );

          setSuccessMsg(
            `¡Oportunidad "${numeroRequerimiento}" actualizada con éxito! Empresa, Marcas y Productos guardados.`
          );
          resetForm();
        } else {
          // ── CREACIÓN ──────────────────────────────────────────────────────
          let backendId: number | string = Date.now();
          try {
            const res = await createOportunidadApi({
              numeroRequerimiento: numeroRequerimiento.toUpperCase().trim(),
              acuerdoMarcoId: Number(selectedAcuerdo.id) || 1,
              fechaVencimientoLicitacion: fechaVencimiento,
              empresaId: selectedEmpresa ? selectedEmpresa.id : null,
              entidadConvocante: entidadConvocante.trim() || undefined,
              marcaIds: selectedMarcas.map((m) => Number(m.id)),
              productos: productosPayload,
            });
            if (res?.id) backendId = res.id;
          } catch {
            // Fallback a local
          }

          const nueva: Oportunidad = {
            id: backendId,
            numeroRequerimiento: numeroRequerimiento.toUpperCase().trim(),
            acuerdoMarco: selectedAcuerdo,
            empresaId: selectedEmpresa ? selectedEmpresa.id : undefined,
            empresaRazonSocial: selectedEmpresa?.razonSocial,
            empresaRuc: selectedEmpresa?.ruc,
            entidadConvocante: entidadConvocante.trim() || undefined,
            marcas: selectedMarcas,
            fechaVencimiento,
            items,
            limiteTotal: totalLimite,
            estado: 'En Licitación',
            creadoPor: creadoPorLabel,
            createdAt: new Date().toLocaleString('es-PE'),
          };

          setOportunidades((prev) => [nueva, ...prev]);
          setSuccessMsg(
            `⚡ ¡Oportunidad "${nueva.numeroRequerimiento}" registrada! Aseguraste la cotización en el sistema.`
          );
          resetForm();
        }
      } finally {
        setLoading(false);
        setTimeout(() => setSuccessMsg(null), 5500);
      }
    },
    [
      isFormValid, selectedAcuerdo, editingId, items, selectedEmpresa,
      entidadConvocante, selectedMarcas, totalLimite, numeroRequerimiento,
      fechaVencimiento, creadoPorLabel, resetForm,
    ]
  );

  return {
    // Catálogos
    acuerdosMarco,
    loadingAcuerdos,
    errorAcuerdos,
    catalogoMarcas,
    catalogoEmpresas,
    loadAcuerdosMarco,

    // Lista de oportunidades
    oportunidades,

    // Estado del formulario
    editingId,
    numeroRequerimiento,
    setNumeroRequerimiento,
    selectedAcuerdo,
    setSelectedAcuerdo,
    fechaVencimiento,
    setFechaVencimiento,
    selectedEmpresa,
    setSelectedEmpresa,
    entidadConvocante,
    setEntidadConvocante,
    selectedMarcas,
    items,

    // UI
    successMsg,
    setSuccessMsg,
    loading,
    isFormValid,
    totalCantidad,
    totalLimite,

    // Acciones
    handleStartEdit,
    handleCancelEdit: resetForm,
    handleSelectMarca,
    handleRemoveMarca,
    handleAddItem,
    handleRemoveItem,
    handleUpdateItem,
    handleSubmit,
  };
}

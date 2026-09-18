import React, { useState, useEffect, useRef } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import {
  createOportunidadApi,
  getOportunidadesApi,
  updateOportunidadApi,
  getAcuerdosMarcoApi,
} from '../../api/services/oportunidades.service';
import { getMarcasApi } from '../../api/services/marca.service';
import type { AcuerdoMarco } from '../../api/Dtos/AcuerdoMarco';
import type { Marca } from '../../api/Dtos/Marca';
import type { ProductoItem } from '../../api/Dtos/ProductoItem';
import type { EmpresaOption } from '../../api/Dtos/Empresa';
import type { RegistroOportunidadPageProps } from '../../props/RegistroOportunidad';
import type { Oportunidad } from '../../models/Oportunidad.model';
import './RegistroOportunidad.css';
import { BuscadorEmpresaModal } from '../../components/BuscadorEmpresaModal/BuscadorEmpresaModal';
import { useSearchParams } from 'react-router-dom';
import type { OportunidadTab } from './OportunidadNavButtons';
import { ListadoOportunidadesView } from './ListadoOportunidadesView';
import { PodioComercialView } from './PodioComercialView';
import { SubirEvidenciaView } from './SubirEvidenciaView';

export const RegistroOportunidadPage: React.FC<RegistroOportunidadPageProps> = ({
  roleAccent = '#06b6d4',
}) => {
  const { empleado } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab de navegación push button sincronizado con URL y Sidebar
  const tabParam = searchParams.get('tab');
  const activeTab: OportunidadTab =
    tabParam === 'listar' || tabParam === 'podio' || tabParam === 'subir-evidencia'
      ? tabParam
      : 'registrar';

  const setActiveTab = (tab: OportunidadTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const [preselectedEvidenciaOpId, setPreselectedEvidenciaOpId] = useState<string | number | null>(null);

  // Modo Edición / Actualización
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // 1. Convocatoria Perú Compras (Inmutables en edición)
  const [numeroRequerimiento, setNumeroRequerimiento] = useState('');
  const [acuerdosMarco, setAcuerdosMarco] = useState<AcuerdoMarco[]>([]);
  const [loadingAcuerdos, setLoadingAcuerdos] = useState<boolean>(true);
  const [errorAcuerdos, setErrorAcuerdos] = useState<string | null>(null);
  const [selectedAcuerdo, setSelectedAcuerdo] = useState<AcuerdoMarco | null>(null);
  const [acuerdoSearch, setAcuerdoSearch] = useState('');
  const [isAcuerdoOpen, setIsAcuerdoOpen] = useState(false);
  const acuerdoRef = useRef<HTMLDivElement>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Modal Empresa State
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaOption | null>(null);
  const [entidadConvocante, setEntidadConvocante] = useState('');

  // 3. Marcas (Editable)
  const [marcasCatalogo, setMarcasCatalogo] = useState<Marca[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<Marca[]>([]);
  const [marcaSearch, setMarcaSearch] = useState('');
  const [isMarcaOpen, setIsMarcaOpen] = useState(false);
  const marcaRef = useRef<HTMLDivElement>(null);

  // 4. Ítems de productos (Editable)
  const [items, setItems] = useState<ProductoItem[]>([
    {
      id: 'item-1',
      numeroParte: '',
      descripcion: '',
      cantidad: 1,
      limiteUnitario: 70, // Ejemplo: req con límite de 70 soles
    },
  ]);

  // Mensaje de éxito o feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Historial de oportunidades registradas
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>(() => {
    const saved = localStorage.getItem('sales_rebel_oportunidades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((op: any) => op && op.acuerdoMarco);
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  // Cargar oportunidades desde backend si está disponible
  useEffect(() => {
    getOportunidadesApi()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Oportunidad[] = data.map((op) => ({
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
            marcas: op.marcas.map((m) => ({ id: m.id, nombre: m.nombre })),
            fechaVencimiento: op.fechaVencimientoLicitacion,
            items: op.productos.map((p) => ({
              id: p.id,
              numeroParte: p.numeroParte,
              descripcion: p.descripcion || '',
              cantidad: p.cantidad,
              limiteUnitario: p.limiteUnitario,
            })),
            limiteTotal: op.limiteTotal,
            estado: (op.estado as any) || 'En Licitación',
            creadoPor: op.creadoPorNombre || 'Ejecutiva',
            createdAt: new Date(op.fechaRegistro).toLocaleString('es-PE'),
            updatedAt: op.fechaActualizacion ? new Date(op.fechaActualizacion).toLocaleString('es-PE') : undefined,
          }));
          setOportunidades(mapped);
        }
      })
      .catch(() => {
        // Backend no conectado aún o sin token: usa estado local
      });
  }, []);

  // Guardar en localStorage cuando cambie la lista
  useEffect(() => {
    localStorage.setItem('sales_rebel_oportunidades', JSON.stringify(oportunidades));
  }, [oportunidades]);

  // Cerrar dropdowns al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (acuerdoRef.current && !acuerdoRef.current.contains(e.target as Node)) {
        setIsAcuerdoOpen(false);
      }
      if (marcaRef.current && !marcaRef.current.contains(e.target as Node)) {
        setIsMarcaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cargar Acuerdos Marco reales desde la Base de Datos (GET /api/acuerdosmarco)
  const loadAcuerdosMarco = async () => {
    setLoadingAcuerdos(true);
    setErrorAcuerdos(null);
    try {
      const data = await getAcuerdosMarcoApi();
      if (Array.isArray(data)) {
        const mapped: AcuerdoMarco[] = data.map((a: any) => ({
          id: a.id,
          codigo: a.codigo ?? '',
          descripcion: a.descripcion || a.descipcion || 'Sin descripción',
          activo: a.activo ?? true,
        }));
        setAcuerdosMarco(mapped);
      }
    } catch (err: any) {
      console.error('Error al consultar GET /api/acuerdosmarco:', err);
      setErrorAcuerdos('No se pudo conectar con el catálogo de Acuerdos Marco en la base de datos.');
    } finally {
      setLoadingAcuerdos(false);
    }
  };

  const loadMarcas = async () => {
    try {
      const marcasData = await getMarcasApi();
      if (Array.isArray(marcasData)) {
        setMarcasCatalogo(marcasData);
      }
    } catch (err) {
      console.error('Error al cargar marcas:', err);
    }
  };

  useEffect(() => {
    loadAcuerdosMarco();
    loadMarcas();
  }, []);


  // Filtrado de Acuerdos Marco reales de la Base de Datos
  const filteredAcuerdos = acuerdosMarco.filter(
    (a) =>
      a.codigo.toLowerCase().includes(acuerdoSearch.toLowerCase()) ||
      a.descripcion.toLowerCase().includes(acuerdoSearch.toLowerCase())
  );


  // Filtrado de Marcas
  const filteredMarcas = marcasCatalogo.filter(
    (m) =>
      m.nombre.toLowerCase().includes(marcaSearch.toLowerCase()) &&
      !selectedMarcas.some((sm) => sm.id === m.id)
  );

  // Manejo de Marcas
  const handleSelectMarca = (marca: Marca) => {
    setSelectedMarcas((prev) => [...prev, marca]);
    setMarcaSearch('');
    setIsMarcaOpen(false);
  };

  const handleRemoveMarca = (marcaId: string | number) => {
    setSelectedMarcas((prev) => prev.filter((m) => m.id !== marcaId));
  };

  // Manejo de Ítems
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        numeroParte: '',
        descripcion: '',
        cantidad: 1,
        limiteUnitario: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string | number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string | number, field: keyof ProductoItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  // Cálculo total del límite
  const totalCantidad = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  const totalLimite = items.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0),
    0
  );

  // Cálculo de tiempo restante de vencimiento
  const getVencimientoBadge = (dateStr: string) => {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr).getTime() - Date.now();
    if (diffMs < 0) return { label: 'Vencida', color: '#ef4444', bg: '#fee2e2' };
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return { label: `Vence hoy (${diffHours}h)`, color: '#d97706', bg: '#fef3c7' };
    const diffDays = Math.floor(diffHours / 24);
    return { label: `En ${diffDays} días`, color: '#059669', bg: '#d1fae5' };
  };

  const vencimientoStatus = getVencimientoBadge(fechaVencimiento);

  // Iniciar Modo Edición
  const handleStartEdit = (op: Oportunidad) => {
    setActiveTab('registrar');
    setEditingId(op.id);
    setNumeroRequerimiento(op.numeroRequerimiento);
    setSelectedAcuerdo(op.acuerdoMarco);
    setFechaVencimiento(op.fechaVencimiento);
    if (op.empresaId && op.empresaRazonSocial) {
      setSelectedEmpresa({
        id: op.empresaId,
        ruc: op.empresaRuc || '',
        razonSocial: op.empresaRazonSocial,
      });
    } else {
      setSelectedEmpresa(null);
    }
    setEntidadConvocante(op.entidadConvocante || '');
    setSelectedMarcas(op.marcas);
    setItems(op.items.map((it) => ({ ...it })));
    setSuccessMsg(null);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Redirigir a Subir Evidencia con oportunidad preseleccionada
  const handleIrASubirEvidencia = (opId: string | number) => {
    setPreselectedEvidenciaOpId(opId);
    setActiveTab('subir-evidencia');
    window.scrollTo({ top: 80, behavior: 'smooth' });
  };

  // Cancelar Modo Edición
  const handleCancelEdit = () => {
    setEditingId(null);
    setNumeroRequerimiento('');
    setSelectedAcuerdo(null);
    setAcuerdoSearch('');
    setFechaVencimiento('');
    setSelectedEmpresa(null);
    setEntidadConvocante('');
    setSelectedMarcas([]);
    setItems([
      {
        id: `item-${Date.now()}`,
        numeroParte: '',
        descripcion: '',
        cantidad: 1,
        limiteUnitario: 70,
      },
    ]);
  };

  // Validaciones para habilitar botón:
  // IMPORTANTE: Empresa e Ítems son 100% opcionales (Registro Exprés), no bloquean el botón
  const isFormValid =
    numeroRequerimiento.trim().length > 0 &&
    selectedAcuerdo !== null &&
    selectedMarcas.length > 0;

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedAcuerdo) return;

    setLoading(true);

    const validItems = items.filter((it) => it.numeroParte.trim());
    const validTotalLimite = validItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0), 0);

    try {
      if (editingId) {
        // ── MODO ACTUALIZACIÓN (REGLA DE NEGOCIO ESTRICTA) ──
        // 1. Convocatoria Perú Compras -> NO SE EDITA
        // 2. Empresa / Entidad -> SE EDITA
        // 3. Marcas y Productos/Límites -> SE EDITAN

        // Intento de actualización en backend
        try {
          await updateOportunidadApi(editingId, {
            empresaId: selectedEmpresa ? selectedEmpresa.id : null,
            entidadConvocante: entidadConvocante.trim() || undefined,
            marcaIds: selectedMarcas.map((m) => Number(m.id)),  // Backend: List<int>
            productos: validItems.map((it) => ({
              numeroParte: it.numeroParte.trim(),
              descripcion: it.descripcion?.trim() || undefined,
              cantidad: Number(it.cantidad),
              limiteUnitario: Number(it.limiteUnitario),
            })),
          });
        } catch {
          // Si el backend no está disponible, se actualiza localmente
        }

        setOportunidades((prev) =>
          prev.map((op) => {
            if (op.id !== editingId) return op;
            return {
              ...op,
              // Datos de convocatoria protegidos:
              numeroRequerimiento: op.numeroRequerimiento,
              acuerdoMarco: op.acuerdoMarco,
              fechaVencimiento: op.fechaVencimiento,
              // Datos editables:
              empresaId: selectedEmpresa ? selectedEmpresa.id : undefined,
              empresaRazonSocial: selectedEmpresa?.razonSocial,
              empresaRuc: selectedEmpresa?.ruc,
              entidadConvocante: entidadConvocante.trim() || undefined,
              marcas: selectedMarcas,
              items: validItems.map((it) => ({ ...it })),
              limiteTotal: validTotalLimite,
              updatedAt: new Date().toLocaleString('es-PE'),
            };
          })
        );

        setSuccessMsg(
          `¡Oportunidad "${numeroRequerimiento}" actualizada con éxito! Se guardaron Empresa, Marcas y Productos. (Datos de Convocatoria Perú Compras blindados).`
        );
        handleCancelEdit();
      } else {
        // ── MODO CREACIÓN ──
        // Múltiples ejecutivas pueden registrar el mismo requerimiento.
        // La prioridad real se determinará luego por fecha, hora y evidencias subidas.

        let backendId: number | string | null = null;
        let apiError: string | null = null;

        try {
          const res = await createOportunidadApi({
            numeroRequerimiento: numeroRequerimiento.toUpperCase().trim(),
            acuerdoMarcoId: Number(selectedAcuerdo.id),  // Backend: int
            fechaVencimientoLicitacion: fechaVencimiento || null,  // Backend: DateTime? (nullable)
            empresaId: selectedEmpresa ? selectedEmpresa.id : null,
            entidadConvocante: entidadConvocante.trim() || undefined,
            marcaIds: selectedMarcas.map((m) => Number(m.id)),  // Backend: List<int>
            productos: validItems.map((it) => ({
              numeroParte: it.numeroParte.trim(),
              descripcion: it.descripcion?.trim() || undefined,
              cantidad: Number(it.cantidad),
              limiteUnitario: Number(it.limiteUnitario),
            })),
          });
          if (res?.id) backendId = res.id;
        } catch (err: any) {
          console.error('Error al registrar oportunidad:', err);
          apiError = err?.message ?? 'Error al conectar con el servidor.';
        }

        // Si el backend falló, mostrar error y NO guardar localmente
        if (apiError || backendId === null) {
          setSuccessMsg(`❌ ${apiError ?? 'No se pudo registrar en el servidor. Verifica que el backend esté activo e intenta nuevamente.'}`);
          return;
        }

        const horaExacta = new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const nuevaOportunidad: Oportunidad = {
          id: backendId,
          numeroRequerimiento: numeroRequerimiento.toUpperCase().trim(),
          acuerdoMarco: selectedAcuerdo,
          empresaId: selectedEmpresa ? selectedEmpresa.id : undefined,
          empresaRazonSocial: selectedEmpresa?.razonSocial,
          empresaRuc: selectedEmpresa?.ruc,
          entidadConvocante: entidadConvocante.trim() || undefined,
          marcas: selectedMarcas,
          fechaVencimiento,
          items: validItems,
          limiteTotal: validTotalLimite,
          estado: 'En Licitación',
          creadoPor: empleado?.nombres ? `${empleado.nombres} (${empleado.rolNombre})` : 'Ejecutiva',
          createdAt: new Date().toLocaleString('es-PE'),
          horaRegistroExacta: horaExacta,
          prioridadGanada: true,
        };

        setOportunidades((prev) => [nuevaOportunidad, ...prev]);
        setSuccessMsg(
          `✅ Requerimiento "${nuevaOportunidad.numeroRequerimiento}" registrado a las ${horaExacta}. Asegúrate de subir tus evidencias en la pestaña correspondiente.`
        );
        handleCancelEdit();
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5500);
    }
  };

  return (
    <div
      className="reg-oportunidad"
      style={
        {
          '--accent-color': roleAccent,
          '--accent-bg': `${roleAccent}1a`,
          '--accent-border': `${roleAccent}47`,
        } as React.CSSProperties
      }
    >
      {/* ── Banner Superior Dinámico según la vista activa ── */}
      <div className="reg-hero">
        <div className="reg-hero__left">
          <div className="reg-hero__badge-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon
              name={
                activeTab === 'listar'
                  ? 'table_chart'
                  : activeTab === 'podio'
                    ? 'emoji_events'
                    : activeTab === 'subir-evidencia'
                      ? 'upload_file'
                      : 'bolt'
              }
              size={28}
              color={roleAccent}
            />
          </div>
          <div className="reg-hero__title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>
                {activeTab === 'listar'
                  ? 'Listado de Oportunidades'
                  : activeTab === 'podio'
                    ? 'Podio Comercial de Ventas'
                    : activeTab === 'subir-evidencia'
                      ? 'Subir Evidencia de Licitación'
                      : 'Registro de Oportunidad de Licitación'}
              </h1>
              <span className="reg-pill-express">
                {activeTab === 'listar'
                  ? `${oportunidades.length} Licitaciones`
                  : activeTab === 'podio'
                    ? 'Top Ranking'
                    : activeTab === 'subir-evidencia'
                      ? 'Constancias'
                      : 'Registro Exprés'}
              </span>
            </div>
            <p>
              {activeTab === 'listar'
                ? 'Monitoreo en vivo de licitaciones, límites Perú Compras y estados comerciales'
                : activeTab === 'podio'
                  ? 'Gamificación y ranking de rendimiento comercial del equipo de ventas'
                  : activeTab === 'subir-evidencia'
                    ? 'Certificación de constancias de cotización y actas de adjudicación Perú Compras'
                    : 'Plataforma de Acuerdos Marco • Catálogo Perú Compras • Registro Rápido para Ejecutivas'}
            </p>
          </div>
        </div>

        <div
          className="reg-hero__tag"
          style={{ background: `${roleAccent}12`, color: roleAccent, border: `1.5px solid ${roleAccent}30` }}
        >
          <GoogleIcon name="verified_user" size={15} color={roleAccent} />
          <span>Ventas &bull; Perú Compras</span>
        </div>
      </div>

      {/* ── VISTA 1: REGISTRAR (Formulario Exprés / Modo Edición) ── */}
      {activeTab === 'registrar' && (
        <>
          {/* ── Banner Informativo de Modo Edición ── */}
          {editingId && (
            <div className="reg-edit-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GoogleIcon name="edit" size={22} color="#b45309" />
                <div>
                  <strong>Modo Actualización de Oportunidad ({numeroRequerimiento})</strong>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    Regla de integridad: <strong>1. Convocatoria Perú Compras</strong> está <strong>BLOQUEADA</strong>. Puedes actualizar <strong>2. Empresa Solicitante</strong>, <strong>3. Marcas</strong> y <strong>4. Productos/Límites</strong>.
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleCancelEdit} className="reg-btn-cancel-edit">
                Cancelar Edición
              </button>
            </div>
          )}

          {/* ── Notificación de Éxito ── */}
          {successMsg && (
            <div className="reg-toast-success">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleIcon name="check_circle" size={20} color="#059669" />
                <strong>{successMsg}</strong>
              </div>
              <button
                onClick={() => setSuccessMsg(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}
              >
                <GoogleIcon name="close" size={16} color="#065f46" />
              </button>
            </div>
          )}

          {/* ── Formulario de Registro en 2 Columnas ── */}
          <form onSubmit={handleSubmit}>
            <div className="reg-grid">
              {/* Columna Izquierda: Formulario Principal */}
              <div className="reg-col-main">
                {/* 1. Datos de la Convocatoria Perú Compras (Inmutables en Edición) */}
                <div className="reg-card">
                  <div className="reg-card__header">
                    <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
                      <GoogleIcon name="feed" size={18} color={roleAccent} />
                    </div>
                    <div>
                      <h3>1. Datos de la Convocatoria Perú Compras</h3>
                      {editingId && (
                        <span style={{ color: '#b45309', fontWeight: 700, fontSize: '11.5px', marginLeft: 0 }}>
                          (Bloqueado por convocatoria oficial — No editable)
                        </span>
                      )}
                    </div>
                    {!editingId && <span className="reg-badge-obligatorio">Paso obligatorio</span>}
                  </div>

                  <div className="reg-form-row">
                    {/* N° Requerimiento */}
                    <div className="reg-field">
                      <label htmlFor="req-number">
                        Número de Requerimiento <span className="required">*</span>
                        {editingId && (
                          <span className="reg-lock-badge">
                            <GoogleIcon name="lock" size={12} color="#b45309" /> Bloqueado
                          </span>
                        )}
                      </label>
                      <input
                        id="req-number"
                        type="text"
                        placeholder="Ej. REQ-001 o REQ-2026-0042"
                        value={numeroRequerimiento}
                        onChange={(e) => setNumeroRequerimiento(e.target.value)}
                        disabled={!!editingId}
                        required
                      />

                      <span className="reg-field-hint">Código oficial en la plataforma Perú Compras</span>
                    </div>

                    {/* Fecha Vencimiento */}
                    <div className="reg-field">
                      <label htmlFor="req-date">
                        Fecha y Hora de Vencimiento <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Opcional)</span>
                        {editingId && (
                          <span className="reg-lock-badge">
                            <GoogleIcon name="lock" size={12} color="#b45309" /> Bloqueado
                          </span>
                        )}
                      </label>
                      <input
                        id="req-date"
                        type="datetime-local"
                        value={fechaVencimiento}
                        onChange={(e) => setFechaVencimiento(e.target.value)}
                        disabled={!!editingId}
                      />
                      {vencimientoStatus && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: vencimientoStatus.color,
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <GoogleIcon name="alarm" size={14} color={vencimientoStatus.color} />
                          {vencimientoStatus.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acuerdo Marco (Combobox con búsqueda por letras conectado a la BD) */}
                  <div className="reg-field" ref={acuerdoRef} style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>
                        Acuerdo Marco (Buscar por Código o Nombre) <span className="required">*</span>
                        {editingId && (
                          <span className="reg-lock-badge">
                            <GoogleIcon name="lock" size={12} color="#b45309" /> Bloqueado
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="reg-combobox">
                      <div className="reg-combobox__input-wrapper">
                        <span className="reg-combobox__icon">
                          <GoogleIcon name="manage_search" size={18} color="#94a3b8" />
                        </span>
                        <input
                          type="text"
                          className="reg-combobox__input"
                          placeholder={
                            loadingAcuerdos
                              ? 'Cargando acuerdos marco de la base de datos...'
                              : 'Escribe letras para buscar... Ej: EXT, Computadoras, Laptops'
                          }
                          value={selectedAcuerdo ? `${selectedAcuerdo.codigo} — ${selectedAcuerdo.descripcion}` : acuerdoSearch}
                          onChange={(e) => {
                            if (editingId) return;
                            setSelectedAcuerdo(null);
                            setAcuerdoSearch(e.target.value);
                            setIsAcuerdoOpen(true);
                          }}
                          onFocus={() => {
                            if (!editingId) setIsAcuerdoOpen(true);
                          }}
                          disabled={!!editingId || loadingAcuerdos}
                        />
                        {(selectedAcuerdo || acuerdoSearch) && !editingId && (
                          <button
                            type="button"
                            className="reg-combobox__clear"
                            onClick={() => {
                              setSelectedAcuerdo(null);
                              setAcuerdoSearch('');
                              setIsAcuerdoOpen(true);
                            }}
                          >
                            <GoogleIcon name="close" size={14} color="#94a3b8" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown de Acuerdos Marco */}
                      {isAcuerdoOpen && !editingId && (
                        <div className="reg-combobox__dropdown">
                          {loadingAcuerdos ? (
                            <div className="reg-combobox__empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}>
                              <GoogleIcon name="sync" size={16} color="#0284c7" />
                              <span>Cargando acuerdos marco desde la base de datos...</span>
                            </div>
                          ) : errorAcuerdos && acuerdosMarco.length === 0 ? (
                            <div className="reg-combobox__empty" style={{ color: '#dc2626', padding: '14px' }}>
                              <div style={{ marginBottom: '6px' }}>{errorAcuerdos}</div>
                              <button
                                type="button"
                                onClick={() => loadAcuerdosMarco()}
                                style={{
                                  padding: '4px 10px',
                                  background: '#ef4444',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  border: 'none',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Reintentar
                              </button>
                            </div>
                          ) : filteredAcuerdos.length === 0 ? (
                            <div className="reg-combobox__empty">
                              {acuerdosMarco.length === 0
                                ? 'No hay acuerdos marco registrados en la base de datos.'
                                : 'No se encontraron acuerdos marco con esa búsqueda'}
                            </div>
                          ) : (
                            filteredAcuerdos.map((acuerdo) => (
                              <button
                                key={acuerdo.id}
                                type="button"
                                className={`reg-combobox__item ${selectedAcuerdo?.id === acuerdo.id ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectedAcuerdo(acuerdo);
                                  setAcuerdoSearch('');
                                  setIsAcuerdoOpen(false);
                                }}
                              >
                                <span className="reg-combobox__item-code">{acuerdo.codigo}</span>
                                <span className="reg-combobox__item-desc">{acuerdo.descripcion}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <span className="reg-field-hint">
                      Catálogo oficial desde la BD {acuerdosMarco.length > 0 ? `(${acuerdosMarco.length} acuerdos cargados)` : ''}
                    </span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

                  {/* Marcas Participantes (Movido a Sección 1) */}
                  <div className="reg-field" ref={marcaRef} style={{ marginBottom: 0 }}>
                    <label>
                      Buscar y Agregar Marca <span className="required">*</span>
                    </label>
                    <div className="reg-combobox">
                      <div className="reg-combobox__input-wrapper">
                        <span className="reg-combobox__icon">
                          <GoogleIcon name="search" size={18} color="#94a3b8" />
                        </span>
                        <input
                          type="text"
                          className="reg-combobox__input"
                          placeholder="Escribe para buscar y añadir marcas... Ej: HP, Lenovo, Dell, Cisco"
                          value={marcaSearch}
                          onChange={(e) => {
                            setMarcaSearch(e.target.value);
                            setIsMarcaOpen(true);
                          }}
                          onFocus={() => setIsMarcaOpen(true)}
                        />
                      </div>

                      {/* Dropdown de Marcas */}
                      {isMarcaOpen && (
                        <div className="reg-combobox__dropdown">
                          {filteredMarcas.length === 0 ? (
                            <div className="reg-combobox__empty">No hay marcas disponibles con ese nombre</div>
                          ) : (
                            filteredMarcas.map((marca) => (
                              <button
                                key={marca.id}
                                type="button"
                                className="reg-combobox__item"
                                onClick={() => handleSelectMarca(marca)}
                              >
                                <span className="reg-combobox__item-desc" style={{ fontWeight: 700 }}>
                                  + {marca.nombre}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chips de Marcas Seleccionadas */}
                    <div className="reg-brand-chips">
                      {selectedMarcas.length === 0 ? (
                        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                          Ninguna marca seleccionada aún (agrega al menos una marca para cotizar).
                        </span>
                      ) : (
                        selectedMarcas.map((m) => (
                          <span key={m.id} className="reg-brand-chip">
                            <span>{m.nombre}</span>
                            <button
                              type="button"
                              className="reg-brand-chip__remove"
                              onClick={() => handleRemoveMarca(m.id)}
                              title="Quitar marca"
                            >
                              <GoogleIcon name="close" size={13} color="#64748b" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Empresa / Entidad Solicitante (⚡ 100% OPCIONAL - Registro Exprés) */}
                <div className="reg-card reg-card--optional">
                  <div className="reg-card__header">
                    <div className="reg-card__header-icon" style={{ background: '#fef3c7' }}>
                      <GoogleIcon name="domain" size={18} color="#d97706" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0 }}>2. Empresa / Entidad Solicitante</h3>
                        <span className="reg-badge-opcional">Opcional &bull; No obligatorio</span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                        (Editable — Se puede registrar o actualizar después para asegurar la cotización rápido)
                      </span>
                    </div>
                  </div>

                  {/* Aviso de Registro Veloz */}
                  <div className="reg-express-alert">
                    <GoogleIcon name="flash_on" size={18} color="#d97706" />
                    <span>
                      <strong>⚡ Prioridad de Cotización:</strong> Si estás compitiendo por tiempo para asegurar la licitación, puedes omitir la empresa y registrar la oportunidad de inmediato. Podrás asociar la empresa o editarla más tarde.
                    </span>
                  </div>

                  <div className="reg-form-row">
                    {/* Selector / Buscador de Empresa Registrada */}
                    <div className="reg-field">
                      <label>
                        Buscar Empresa en Base de Datos <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Opcional)</span>
                      </label>

                      {selectedEmpresa ? (
                        <div className="reg-empresa-selected-card">
                          <div className="reg-empresa-selected-info">
                            <span className="reg-empresa-selected-ruc">{selectedEmpresa.ruc}</span>
                            <span className="reg-empresa-selected-name">{selectedEmpresa.razonSocial}</span>
                          </div>
                          <div className="reg-empresa-selected-actions">
                            <button type="button" onClick={() => setIsEmpresaModalOpen(true)} className="reg-empresa-btn-change">
                              Cambiar
                            </button>
                            <button type="button" onClick={() => setSelectedEmpresa(null)} className="reg-empresa-btn-remove" title="Quitar empresa">
                              <GoogleIcon name="close" size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="reg-btn-open-modal"
                          onClick={() => setIsEmpresaModalOpen(true)}
                        >
                          <GoogleIcon name="search" size={18} />
                          Buscar y Seleccionar Empresa...
                        </button>
                      )}
                      <span className="reg-field-hint">Si la empresa ya está en el sistema, selecciónala aquí</span>
                    </div>

                    {/* Nombre de Entidad Libre (Rápido) */}
                    <div className="reg-field">
                      <label>
                        O escribe la Entidad Solicitante <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. UGEL 03, Hospital Regional, Pronis..."
                        value={entidadConvocante}
                        onChange={(e) => setEntidadConvocante(e.target.value)}
                      />
                      <span className="reg-field-hint">Nombre rápido de la institución del requerimiento</span>
                    </div>
                  </div>
                </div>

                {/* 3. Productos / Ítems de la Licitación (Editable) */}
                <div className="reg-card">
                  <div className="reg-items-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
                        <GoogleIcon name="inventory_2" size={18} color={roleAccent} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                          3. Productos y Límites del Requerimiento Perú Compras
                        </h3>
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                          (Editable — Puedes agregar, modificar o quitar productos, números de parte y límites)
                        </span>
                      </div>
                    </div>

                    <button type="button" onClick={handleAddItem} className="reg-btn-add-item">
                      <GoogleIcon name="add" size={16} color={roleAccent} />
                      <span>+ Agregar Producto</span>
                    </button>
                  </div>

                  {items.map((item, index) => {
                    const subtotal = (Number(item.cantidad) || 0) * (Number(item.limiteUnitario) || 0);
                    return (
                      <div key={item.id} className="reg-item-box">
                        <div className="reg-item-top">
                          <span className="reg-item-number">Ítem #{index + 1} del Requerimiento</span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="reg-item-delete"
                              title="Eliminar este ítem"
                            >
                              <GoogleIcon name="close" size={16} color="#ef4444" />
                            </button>
                          )}
                        </div>

                        <div className="reg-form-row">
                          {/* Número de Parte */}
                          <div className="reg-field">
                            <label>
                              Número de Parte <span className="required">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. 82XF004CLM / 15-fa1093dx"
                              value={item.numeroParte}
                              onChange={(e) => handleUpdateItem(item.id, 'numeroParte', e.target.value)}
                            />
                          </div>

                          {/* Descripción del Producto */}
                          <div className="reg-field">
                            <label>Descripción del Producto (Opcional si tiene N° Parte)</label>
                            <input
                              type="text"
                              placeholder="Ej. Laptop Lenovo Core i5 16GB 512GB SSD"
                              value={item.descripcion}
                              onChange={(e) => handleUpdateItem(item.id, 'descripcion', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="reg-form-row" style={{ marginBottom: 0 }}>
                          {/* Cantidad */}
                          <div className="reg-field">
                            <label>
                              Cantidad Solicitada <span className="required">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Ej. 10"
                              value={item.cantidad}
                              onChange={(e) => handleUpdateItem(item.id, 'cantidad', Math.max(1, parseInt(e.target.value) || 0))}
                              required
                            />
                          </div>

                          {/* Límite Unitario Perú Compras */}
                          <div className="reg-field">
                            <label>
                              Límite de Cotización Unitario (S/) <span className="required">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="Ej. 70.00"
                              value={item.limiteUnitario}
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'limiteUnitario', parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                            <span className="reg-field-hint">Monto tope por producto fijado por Perú Compras</span>
                          </div>
                        </div>

                        <div className="reg-item-subtotal-badge">
                          <span>Límite Subtotal del Ítem ({item.cantidad} unids &times; S/ {Number(item.limiteUnitario).toFixed(2)}):</span>
                          <strong>S/ {subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Tarjeta de Resumen y Envío */}
              <div className="reg-col-side">
                <div className="reg-summary-card">
                  <div className="reg-summary-title">
                    <GoogleIcon name="receipt_long" size={20} color={roleAccent} />
                    <span>{editingId ? 'Actualizar Oportunidad' : 'Resumen de la Oportunidad'}</span>
                  </div>

                  <div className="reg-summary-row">
                    <span className="reg-summary-label">Requerimiento:</span>
                    <span className="reg-summary-val" style={{ color: roleAccent, fontWeight: 700 }}>
                      {numeroRequerimiento || 'Por ingresar'}
                    </span>
                  </div>

                  <div className="reg-summary-row">
                    <span className="reg-summary-label">Acuerdo Marco:</span>
                    <span className="reg-summary-val">
                      {selectedAcuerdo ? selectedAcuerdo.codigo : 'No seleccionado'}
                    </span>
                  </div>

                  <div className="reg-summary-row">
                    <span className="reg-summary-label">Empresa / Cliente:</span>
                    <span className="reg-summary-val">
                      {selectedEmpresa ? (
                        selectedEmpresa.razonSocial
                      ) : entidadConvocante ? (
                        entidadConvocante
                      ) : (
                        <span style={{ color: '#d97706', fontSize: '11px' }}>⚡ Exprés (Sin asignar)</span>
                      )}
                    </span>
                  </div>

                  <div className="reg-summary-row">
                    <span className="reg-summary-label">Marcas participantes:</span>
                    <span className="reg-summary-val">
                      {selectedMarcas.length > 0 ? selectedMarcas.map((m) => m.nombre).join(', ') : 'Sin marcas'}
                    </span>
                  </div>

                  <div className="reg-summary-row">
                    <span className="reg-summary-label">Vencimiento:</span>
                    <span className="reg-summary-val">
                      {fechaVencimiento ? new Date(fechaVencimiento).toLocaleString('es-PE') : 'No definido'}
                    </span>
                  </div>

                  <div className="reg-summary-row">
                    <span className="reg-summary-label">Total Ítems:</span>
                    <span className="reg-summary-val">
                      {items.length} {items.length === 1 ? 'producto' : 'productos'} ({totalCantidad} unids)
                    </span>
                  </div>

                  {/* Límite Total de Perú Compras */}
                  <div className="reg-summary-total-box">
                    <div className="reg-summary-total-label">Límite Total Perú Compras</div>
                    <div className="reg-summary-total-amount">
                      S/ {totalLimite.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="reg-summary-total-hint">
                      Tope máximo para cotizar en esta licitación
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="reg-btn-submit"
                    style={{
                      background: isFormValid ? roleAccent : '#cbd5e1',
                      cursor: isFormValid ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <GoogleIcon name={editingId ? 'save' : 'flash_on'} size={20} color="#ffffff" />
                    <span>
                      {loading
                        ? 'Guardando...'
                        : editingId
                          ? 'Guardar Cambios en Oportunidad'
                          : '⚡ Registrar Oportunidad al Instante'}
                    </span>
                  </button>

                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="reg-btn-cancel-sidebar">
                      Cancelar Edición
                    </button>
                  )}

                  {!isFormValid && (
                    <div className="reg-validation-hint">
                      Completa el N° de Requerimiento, Acuerdo Marco, Fecha, al menos 1 Marca y 1 Producto. (La Empresa es opcional).
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </>
      )}

      {/* ── VISTA 2: LISTAR (Todas las Oportunidades con KPIs, Búsqueda y Filtros) ── */}
      {activeTab === 'listar' && (
        <ListadoOportunidadesView
          oportunidades={oportunidades}
          roleAccent={roleAccent}
          onEdit={(op) => {
            handleStartEdit(op);
          }}
          onSubirEvidencia={handleIrASubirEvidencia}
          getVencimientoBadge={getVencimientoBadge}
        />
      )}

      {/* ── VISTA 3: PODIO (Ranking Comercial y Gamificación: Licitaciones vs Ventas) ── */}
      {activeTab === 'podio' && (
        <PodioComercialView
          oportunidades={oportunidades}
          roleAccent={roleAccent}
          initialTipo={(searchParams.get('tipo') as any) || 'licitaciones'}
        />
      )}

      {/* ── VISTA 4: SUBIR EVIDENCIA (Constancias de Cotización / Buena Pro) ── */}
      {activeTab === 'subir-evidencia' && (
        <SubirEvidenciaView
          oportunidades={oportunidades}
          roleAccent={roleAccent}
          preselectedOportunidadId={preselectedEvidenciaOpId}
        />
      )}


      {/* Modal Buscador de Empresa */}
      {isEmpresaModalOpen && (
        <BuscadorEmpresaModal
          onClose={() => setIsEmpresaModalOpen(false)}
          onSelect={(emp) => {
            setSelectedEmpresa(emp);
            setIsEmpresaModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default RegistroOportunidadPage;

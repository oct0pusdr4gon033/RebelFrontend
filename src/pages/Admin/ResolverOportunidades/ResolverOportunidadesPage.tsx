import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { GoogleIcon } from '../../../components/GoogleIcon';
import { getOportunidadesApi, cambiarEstadoApi } from '../../../api/services/oportunidades.service';
import { mapApiToOportunidad, getVencimientoBadge } from '../../../hooks/useOportunidades';
import { formatHoraExacta, formatDiferenciaTiempo } from '../../../utils/dateUtils';
import type { Oportunidad } from '../../../types/oportunidades';
import { DetalleOportunidadView } from '../../Oportunidades/DetalleOportunidadView';
import { PodioRequerimientoModal } from '../../../components/Podio/PodioRequerimientoModal';
import '../../Oportunidades/RegistroOportunidad.css';
import './ResolverOportunidades.css';

// Iconos SVG corporativos para SweetAlert2 y Podio
const SVG_TROPHY = `<svg width="26" height="26" viewBox="0 0 24 24" fill="#d97706" style="vertical-align: middle; display: inline-block;"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`;
const SVG_CROWN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#15803d" style="vertical-align: middle; display: inline-block; margin-right: 6px;"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;
const SVG_WARNING = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#b45309" style="vertical-align: middle; display: inline-block; margin-right: 6px; flex-shrink: 0;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;

const SVG_EYE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}>
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

interface ResolverOportunidadesPageProps {
  roleAccent?: string;
}

type TabEstado = 'todos' | 'pendientes' | 'adjudicadas' | 'desestimadas' | 'cotizadas' | 'en-licitacion';

const ESTADO_BADGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  'En Licitación': { label: 'En Licitación', color: '#d97706', bg: '#fef3c7', icon: 'bolt' },
  'Cotizada': { label: 'Cotizada', color: '#2563eb', bg: '#eff6ff', icon: 'description' },
  'Adjudicada': { label: 'Adjudicada', color: '#059669', bg: '#ecfdf5', icon: 'verified' },
  'Desestimada': { label: 'Desestimada', color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  'Por Vencer': { label: 'Por Vencer', color: '#ea580c', bg: '#ffedd5', icon: 'timer' },
  'OC_RECIBIDA': { label: 'OC Recibida', color: '#0284c7', bg: '#e0f2fe', icon: 'receipt_long' },
  'OC_ACEPTADA': { label: 'OC Aceptada', color: '#059669', bg: '#ecfdf5', icon: 'thumb_up' },
  'OC_RECHAZADA': { label: 'OC Rechazada', color: '#dc2626', bg: '#fee2e2', icon: 'thumb_down' },
  'ENTREGADA': { label: 'Entregada', color: '#7c3aed', bg: '#f5f3ff', icon: 'inventory' },
};

export const ResolverOportunidadesPage: React.FC<ResolverOportunidadesPageProps> = ({
  roleAccent = '#2563eb',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeMainTab: 'bandeja' | 'resolver' = tabParam === 'resolver' ? 'resolver' : 'bandeja';

  const rqParam = searchParams.get('rq');
  const [selectedReq, setSelectedReq] = useState<string>(rqParam || 'todos');
  const [filtroTipoReq, setFiltroTipoReq] = useState<'todos' | 'disputados' | 'pendientes' | 'resueltos'>('todos');
  const [busquedaReq, setBusquedaReq] = useState<string>('');

  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabEstado>('pendientes');
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEjecutiva, setFiltroEjecutiva] = useState<string>('todos');
  const [filtroAcuerdo, setFiltroAcuerdo] = useState<string>('todos');
  const [orden, setOrden] = useState<'vencimiento' | 'recientes' | 'monto'>('vencimiento');

  // Modales de resolución
  const [adjudicarModalOp, setAdjudicarModalOp] = useState<Oportunidad | null>(null);
  const [adjudicarNotas, setAdjudicarNotas] = useState<string>('');
  const [procesandoResolucion, setProcesandoResolucion] = useState<boolean>(false);

  const [desestimarModalOp, setDesestimarModalOp] = useState<Oportunidad | null>(null);
  const [desestimarMotivo, setDesestimarMotivo] = useState<string>('Precio no competitivo');
  const [desestimarObservacion, setDesestimarObservacion] = useState<string>('');

  // Menú flotante de acciones adicionales
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | number | null>(null);

  // Modal de Detalle Completo
  const [detalleModalOp, setDetalleModalOp] = useState<Oportunidad | null>(null);

  // Modal de Podio del Requerimiento
  const [podioModalReq, setPodioModalReq] = useState<string | null>(null);

  // Cargar oportunidades desde la API
  const cargarOportunidades = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOportunidadesApi();
      if (Array.isArray(data)) {
        setOportunidades(data.map(mapApiToOportunidad));
      }
    } catch (err) {
      console.warn('[ResolverOportunidades] Error al cargar desde API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarOportunidades();
  }, [cargarOportunidades]);

  // Sincronizar selectedReq con URL si viene en searchParams
  useEffect(() => {
    if (rqParam && rqParam !== selectedReq) {
      setSelectedReq(rqParam);
    }
  }, [rqParam]);

  const handleMainTabChange = (tab: 'bandeja' | 'resolver', reqTarget?: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (reqTarget) {
        next.set('rq', reqTarget);
      } else if (tab === 'bandeja') {
        next.delete('rq');
      }
      return next;
    });
  };

  const handleIrAPodioResolver = (req: string) => {
    setSelectedReq(req);
    handleMainTabChange('resolver', req);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cerrar menú emergente si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = () => setMenuAbiertoId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Lista única de ejecutivas para el filtro
  const listaEjecutivas = useMemo(() => {
    const set = new Set<string>();
    oportunidades.forEach((op) => {
      if (op.creadoPor) set.add(op.creadoPor);
    });
    return Array.from(set).sort();
  }, [oportunidades]);

  // Lista única de acuerdos marco para el filtro
  const listaAcuerdos = useMemo(() => {
    const set = new Set<string>();
    oportunidades.forEach((op) => {
      if (op.acuerdoMarco?.codigo) set.add(op.acuerdoMarco.codigo);
    });
    return Array.from(set).sort();
  }, [oportunidades]);

  // Mapa de concurrencia: cantidad de ejecutivas que postularon al mismo requerimiento
  const concurrenciaPorReq = useMemo(() => {
    const map = new Map<string, number>();
    oportunidades.forEach((o) => {
      const r = (o.numeroRequerimiento || '').trim().toUpperCase();
      if (r) map.set(r, (map.get(r) || 0) + 1);
    });
    return map;
  }, [oportunidades]);

  // Lista de requerimientos agrupados con estadísticas de competencia
  const requerimientosInfo = useMemo(() => {
    const mapa = new Map<string, Oportunidad[]>();
    oportunidades.forEach((op) => {
      const r = (op.numeroRequerimiento || '').trim().toUpperCase();
      if (!r) return;
      const list = mapa.get(r) || [];
      list.push(op);
      mapa.set(r, list);
    });

    const lista = Array.from(mapa.entries()).map(([req, ops]) => {
      // Ordenar cronológicamente
      const opsSorted = [...ops].sort((a, b) => {
        const tA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
        const tB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
        return tA - tB;
      });

      const ganadorOp = opsSorted.find(
        (o) => o.estado === 'Adjudicada' || ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(o.estado)
      );
      const liderLlegada = opsSorted[0];
      const count = opsSorted.length;
      const esDisputado = count > 1;
      const tieneGanador = !!ganadorOp;
      const estaPendiente = !tieneGanador && opsSorted.some((o) => o.estado === 'En Licitación' || o.estado === 'Cotizada');
      const montoTotal = Number(opsSorted[0]?.limiteTotal) || 0;
      const entidad = opsSorted[0]?.entidadConvocante || opsSorted[0]?.empresaRazonSocial || 'Entidad no especificada';
      const acuerdo = opsSorted[0]?.acuerdoMarco?.codigo || 'Acuerdo Marco';
      const vencimiento = opsSorted[0]?.fechaVencimiento || null;

      return {
        req,
        ops: opsSorted,
        count,
        montoTotal,
        entidad,
        acuerdo,
        vencimiento,
        ganadorOp,
        tieneGanador,
        estaPendiente,
        esDisputado,
        liderLlegada,
      };
    });

    // Ordenar: primero los disputados y pendientes, luego por cantidad de competidores
    return lista.sort((a, b) => {
      if (a.estaPendiente && !b.estaPendiente) return -1;
      if (!a.estaPendiente && b.estaPendiente) return 1;
      return b.count - a.count;
    });
  }, [oportunidades]);

  // Filtrar requerimientos según buscador y píldoras
  const requerimientosFiltrados = useMemo(() => {
    return requerimientosInfo.filter((r) => {
      // Filtro por píldora
      if (filtroTipoReq === 'disputados' && !r.esDisputado) return false;
      if (filtroTipoReq === 'pendientes' && !r.estaPendiente) return false;
      if (filtroTipoReq === 'resueltos' && !r.tieneGanador) return false;

      // Filtro por texto de búsqueda
      if (busquedaReq.trim()) {
        const q = busquedaReq.toLowerCase().trim();
        const rqMatch = r.req.toLowerCase().includes(q);
        const entidadMatch = r.entidad.toLowerCase().includes(q);
        const acuerdoMatch = r.acuerdo.toLowerCase().includes(q);
        const creadorMatch = r.ops.some((o) => (o.creadoPor || '').toLowerCase().includes(q));
        if (!rqMatch && !entidadMatch && !acuerdoMatch && !creadorMatch) return false;
      }

      return true;
    });
  }, [requerimientosInfo, filtroTipoReq, busquedaReq]);

  // Podio y orden de llegada para el requerimiento seleccionado
  const podioReqData = useMemo(() => {
    if (selectedReq === 'todos') return null;

    const reqItem = requerimientosInfo.find(
      (r) => r.req.toUpperCase() === selectedReq.trim().toUpperCase()
    );
    if (!reqItem) return null;

    const opsDelReq = reqItem.ops;
    const primerTiempo = opsDelReq[0]?.fechaRegistro
      ? new Date(opsDelReq[0].fechaRegistro).getTime()
      : 0;

    // Detectar empates técnicos por segundo
    const conteoPorSegundo = new Map<number, number>();
    opsDelReq.forEach((o) => {
      const t = o.fechaRegistro ? Math.floor(new Date(o.fechaRegistro).getTime() / 1000) : 0;
      conteoPorSegundo.set(t, (conteoPorSegundo.get(t) || 0) + 1);
    });

    let posicionActual = 1;
    const ranking = opsDelReq.map((op, idx) => {
      const tiempoActual = op.fechaRegistro ? new Date(op.fechaRegistro).getTime() : 0;
      const segundoActual = Math.floor(tiempoActual / 1000);
      const diffMs = Math.max(0, tiempoActual - primerTiempo);
      const hayEmpate = (conteoPorSegundo.get(segundoActual) || 0) > 1;

      if (idx > 0) {
        const prevFecha = opsDelReq[idx - 1]?.fechaRegistro;
        const prevTiempo = prevFecha ? new Date(prevFecha).getTime() : 0;
        if (tiempoActual !== prevTiempo) {
          posicionActual = idx + 1;
        }
      } else {
        posicionActual = 1;
      }

      const esGanador = op.estado === 'Adjudicada' || ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado);
      const esLiderLlegada = posicionActual === 1;
      const nombreGanador = op.creadoPor?.includes('@')
        ? op.creadoPor.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : op.creadoPor || 'Ejecutiva';

      let diferenciaTexto = '⚡ 1° en llegar';
      if (hayEmpate && esLiderLlegada) {
        diferenciaTexto = '🤝 Empate técnico (0s)';
      } else if (hayEmpate && diffMs > 0) {
        diferenciaTexto = `🤝 Empate (${formatDiferenciaTiempo(diffMs)})`;
      } else if (diffMs > 0) {
        diferenciaTexto = formatDiferenciaTiempo(diffMs);
      }

      return {
        op,
        posicion: posicionActual,
        esLiderLlegada,
        esGanador,
        hayEmpate,
        diferenciaTexto,
        nombre: nombreGanador,
        email: op.creadoPor || '',
        horaRegistro: formatHoraExacta(op.fechaRegistro),
      };
    });

    const top1 = ranking.find((r) => r.posicion === 1) || ranking[0] || null;
    const top2 = ranking.find((r) => r.posicion === 2) || ranking[1] || null;
    const top3 = ranking.find((r) => r.posicion === 3) || ranking[2] || null;
    const top4 = ranking.find((r) => r.posicion === 4) || ranking[3] || null;
    const top5 = ranking.find((r) => r.posicion === 5) || ranking[4] || null;

    return {
      reqItem,
      ranking,
      top1,
      top2,
      top3,
      top4,
      top5,
    };
  }, [selectedReq, requerimientosInfo]);

  // Dictaminar Buena Pro (Regla de Adjudicación Única) con SweetAlert Corporativo SVG
  const handleAsignarGanador = async (ganadorOp: Oportunidad) => {
    const req = (ganadorOp.numeroRequerimiento || '').trim().toUpperCase();
    const competidores = oportunidades.filter(
      (o) => (o.numeroRequerimiento || '').trim().toUpperCase() === req
    );
    const otrosCompetidores = competidores.filter((c) => String(c.id) !== String(ganadorOp.id));
    const nombreGanador = ganadorOp.creadoPor || 'Ejecutiva';

    const confirm = await Swal.fire({
      title: `<div style="display:flex; align-items:center; justify-content:center; gap:8px;">${SVG_TROPHY}<span style="font-weight:800; color:#0f172a;">Asignar Buena Pro</span></div>`,
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.5; color: #334155;">
          <p style="margin-top: 4px;">¿Confirmas la asignación oficial de la <strong>BUENA PRO</strong> para este requerimiento a:</p>
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px; margin: 12px 0;">
            <div style="font-weight: 800; color: #166534; font-size: 15px; display: flex; align-items: center;">
              ${SVG_CROWN}
              <span>${nombreGanador}</span>
            </div>
            <div style="color: #15803d; font-size: 12.5px; margin-top: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span>Requerimiento: <strong>${ganadorOp.numeroRequerimiento}</strong></span>
              <span>&bull;</span>
              <span>Límite Total: <strong>S/ ${Number(ganadorOp.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
          ${otrosCompetidores.length > 0
          ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; color: #92400e; font-size: 12px; margin-top: 10px; display: flex; align-items: flex-start;">
                  ${SVG_WARNING}
                  <span><strong>Regla de Adjudicación Única:</strong> Existen <strong>${otrosCompetidores.length}</strong> otra(s) postulación(es) competidora(s). Al confirmar, pasarán automáticamente a estado <strong>Desestimada</strong>.</span>
                </div>`
          : ''
        }
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Asignar Ganador',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    setProcesandoResolucion(true);
    try {
      // 1. Si otro competidor ya tenía la Buena Pro, desestimarlo primero para liberar la regla de adjudicación única en el backend
      const previoGanador = otrosCompetidores.find(
        (c) => c.estado === 'Adjudicada' || ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(c.estado)
      );
      if (previoGanador) {
        await cambiarEstadoApi(previoGanador.id, 'Desestimada');
      }

      // 2. Dictaminar la adjudicación al nuevo ganador
      await cambiarEstadoApi(ganadorOp.id, 'Adjudicada');

      // 3. Desestimar al resto de postulaciones competidoras
      const promesasDesestimar = otrosCompetidores
        .filter((c) => c.id !== previoGanador?.id && c.estado !== 'Desestimada')
        .map((c) => cambiarEstadoApi(c.id, 'Desestimada').catch((e) => console.warn(e)));
      await Promise.all(promesasDesestimar);

      // Actualizar estado local inmediatamente
      setOportunidades((prev) =>
        prev.map((item) => {
          if (String(item.id) === String(ganadorOp.id)) {
            return { ...item, estado: 'Adjudicada' as const };
          }
          if (otrosCompetidores.some((o) => String(o.id) === String(item.id))) {
            return { ...item, estado: 'Desestimada' as const };
          }
          return item;
        })
      );

      Swal.fire({
        icon: 'success',
        title: '¡Buena Pro Asignada!',
        text: `La postulación de ${nombreGanador} ha sido Adjudicada con éxito.${otrosCompetidores.length > 0
          ? ` Se marcaron ${otrosCompetidores.length} postulación(es) competidora(s) como Desestimadas.`
          : ''
          }`,
        confirmButtonColor: '#059669',
        timer: 3500,
        timerProgressBar: true,
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al dictaminar Buena Pro',
        text: err.message || 'Ocurrió un error al actualizar los estados en el servidor.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setProcesandoResolucion(false);
    }
  };

  // Reabrir Licitación / Anular Dictamen de Buena Pro para este requerimiento
  const handleReabrirLicitacion = async (reqTarget?: string) => {
    const numeroReq = (reqTarget || (podioReqData?.reqItem?.req ?? '')).trim().toUpperCase();
    if (!numeroReq) return;

    const competidores = oportunidades.filter(
      (o) => (o.numeroRequerimiento || '').trim().toUpperCase() === numeroReq
    );
    const ganadorActual = competidores.find(
      (o) => o.estado === 'Adjudicada' || ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(o.estado)
    );
    const nombreGanador = ganadorActual?.creadoPor || 'la ejecutiva ganadora';

    const confirm = await Swal.fire({
      title: `<div style="display:flex; align-items:center; justify-content:center; gap:8px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:50%; background:#fef3c7; color:#b45309;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
        </span>
        <span style="font-weight:800; color:#0f172a;">Reabrir Licitación</span>
      </div>`,
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.5; color: #334155;">
          <p style="margin-top: 4px;">
            ¿Confirmas que deseas <strong>reabrir la licitación</strong> para el requerimiento <strong>${numeroReq}</strong>?
          </p>
          <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 12px; margin: 12px 0;">
            <div style="font-weight: 800; color: #92400e; font-size: 13.5px;">
              Efectos de la Reapertura Oficial:
            </div>
            <ul style="margin: 8px 0 0; padding-left: 18px; color: #78350f; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <li>Se <strong>anulará la adjudicación</strong> otorgada a <strong>${nombreGanador}</strong>.</li>
              <li>Todas las postulaciones (${competidores.length} ejecutivas) volverán al estado <strong>En Licitación</strong>.</li>
              <li>Todos los puestos del podio quedarán <strong>desbloqueados</strong> para que la administradora pueda dictaminar nuevamente.</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Reabrir Licitación',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    setProcesandoResolucion(true);
    try {
      const promesas = competidores.map((c) =>
        cambiarEstadoApi(c.id, 'En Licitación').catch((err) => {
          console.warn(`Error al reabrir postulación ${c.id}:`, err);
        })
      );
      await Promise.all(promesas);

      setOportunidades((prev) =>
        prev.map((item) => {
          if ((item.numeroRequerimiento || '').trim().toUpperCase() === numeroReq) {
            return { ...item, estado: 'En Licitación' as const };
          }
          return item;
        })
      );

      Swal.fire({
        icon: 'success',
        title: '¡Licitación Reabierta!',
        text: `El requerimiento ${numeroReq} ha sido devuelto a EN LICITACIÓN. Todos los puestos han sido desbloqueados.`,
        confirmButtonColor: '#059669',
        timer: 3500,
        timerProgressBar: true,
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al reabrir licitación',
        text: err.message || 'Ocurrió un error al contactar al servidor.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setProcesandoResolucion(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = oportunidades.length;
    const pendientes = oportunidades.filter((op) => op.estado === 'En Licitación' || op.estado === 'Cotizada');
    const adjudicadas = oportunidades.filter((op) =>
      op.estado === 'Adjudicada' || ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado)
    );
    const desestimadas = oportunidades.filter((op) => op.estado === 'Desestimada' || op.estado === 'OC_RECHAZADA');
    const urgentes = oportunidades.filter((op) => {
      if (!op.fechaVencimiento || ['Adjudicada', 'Desestimada', 'ENTREGADA'].includes(op.estado)) return false;
      const diffMs = new Date(op.fechaVencimiento).getTime() - Date.now();
      return diffMs < 24 * 60 * 60 * 1000; // Vencida o vence en <24h
    });

    const montoAdjudicado = adjudicadas.reduce((sum, op) => sum + (Number(op.limiteTotal) || 0), 0);
    const montoTotal = oportunidades.reduce((sum, op) => sum + (Number(op.limiteTotal) || 0), 0);

    return {
      total,
      pendientesCount: pendientes.length,
      adjudicadasCount: adjudicadas.length,
      adjudicadasMonto: montoAdjudicado,
      desestimadasCount: desestimadas.length,
      urgentesCount: urgentes.length,
      montoTotal,
    };
  }, [oportunidades]);

  // Filtrado y ordenamiento
  const oportunidadesFiltradas = useMemo(() => {
    let result = oportunidades.filter((op) => {
      // 1. Filtro por Pestaña
      if (activeTab === 'pendientes') {
        if (op.estado !== 'En Licitación' && op.estado !== 'Cotizada') return false;
      } else if (activeTab === 'adjudicadas') {
        if (op.estado !== 'Adjudicada' && !['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado)) return false;
      } else if (activeTab === 'desestimadas') {
        if (op.estado !== 'Desestimada' && op.estado !== 'OC_RECHAZADA') return false;
      } else if (activeTab === 'cotizadas') {
        if (op.estado !== 'Cotizada') return false;
      } else if (activeTab === 'en-licitacion') {
        if (op.estado !== 'En Licitación') return false;
      }

      // 2. Filtro por Ejecutiva
      if (filtroEjecutiva !== 'todos' && op.creadoPor !== filtroEjecutiva) {
        return false;
      }

      // 3. Filtro por Acuerdo Marco
      if (filtroAcuerdo !== 'todos' && op.acuerdoMarco?.codigo !== filtroAcuerdo) {
        return false;
      }

      // 4. Búsqueda de texto
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const req = (op.numeroRequerimiento || '').toLowerCase();
        const entidad = (op.entidadConvocante || '').toLowerCase();
        const empresa = (op.empresaRazonSocial || '').toLowerCase();
        const ruc = (op.empresaRuc || '').toLowerCase();
        const marcas = (op.marcas || []).map((m) => m.nombre.toLowerCase()).join(' ');
        const acuerdo = (op.acuerdoMarco?.codigo || '').toLowerCase();
        const creadoPor = (op.creadoPor || '').toLowerCase();

        return (
          req.includes(query) ||
          entidad.includes(query) ||
          empresa.includes(query) ||
          ruc.includes(query) ||
          marcas.includes(query) ||
          acuerdo.includes(query) ||
          creadoPor.includes(query)
        );
      }

      return true;
    });

    // Ordenamiento
    return result.sort((a, b) => {
      if (orden === 'vencimiento') {
        const da = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : Infinity;
        const db = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : Infinity;
        return da - db;
      }
      if (orden === 'recientes') {
        const da = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
        const db = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
        return db - da;
      }
      if (orden === 'monto') {
        return (Number(b.limiteTotal) || 0) - (Number(a.limiteTotal) || 0);
      }
      return 0;
    });
  }, [oportunidades, activeTab, filtroEjecutiva, filtroAcuerdo, busqueda, orden]);

  // Ejecutar cambio de estado en backend y frontend
  const resolverEstado = async (op: Oportunidad, nuevoEstado: string, mensajeExito: string) => {
    setProcesandoResolucion(true);
    try {
      const res = await cambiarEstadoApi(op.id, nuevoEstado);
      const estadoFinal = (res.estado || nuevoEstado) as Oportunidad['estado'];

      setOportunidades((prev) =>
        prev.map((item) => (String(item.id) === String(op.id) ? { ...item, estado: estadoFinal } : item))
      );

      Swal.fire({
        icon: 'success',
        title: '¡Oportunidad Resuelta!',
        text: mensajeExito,
        confirmButtonColor: roleAccent,
        confirmButtonText: 'Aceptar',
        timer: 3000,
        timerProgressBar: true,
      });

      // Cerrar modales
      setAdjudicarModalOp(null);
      setDesestimarModalOp(null);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo resolver la oportunidad',
        text: err.message || 'Ocurrió un error al actualizar el estado en el servidor.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setProcesandoResolucion(false);
    }
  };

  // Confirmar Adjudicación
  const handleConfirmarAdjudicar = () => {
    if (!adjudicarModalOp) return;
    resolverEstado(
      adjudicarModalOp,
      'Adjudicada',
      `El requerimiento "${adjudicarModalOp.numeroRequerimiento}" ha sido declarado ADJUDICADO con éxito. Pasa al flujo de Orden de Compra.`
    );
  };

  // Confirmar Desestimación
  const handleConfirmarDesestimar = () => {
    if (!desestimarModalOp) return;
    const razon = desestimarObservacion.trim()
      ? `${desestimarMotivo} — ${desestimarObservacion.trim()}`
      : desestimarMotivo;

    resolverEstado(
      desestimarModalOp,
      'Desestimada',
      `El requerimiento "${desestimarModalOp.numeroRequerimiento}" ha sido marcado como DESESTIMADO (${razon}).`
    );
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (oportunidadesFiltradas.length === 0) {
      alert('No hay oportunidades para exportar.');
      return;
    }

    const headers = [
      'Requerimiento',
      'Estado',
      'Límite Total (PEN)',
      'Ejecutiva',
      'Entidad/Empresa',
      'RUC',
      'Acuerdo Marco',
      'Marcas',
      'Fecha Vencimiento',
      'Fecha Registro',
    ];

    const rows = oportunidadesFiltradas.map((op) => [
      `"${op.numeroRequerimiento}"`,
      `"${op.estado}"`,
      op.limiteTotal,
      `"${op.creadoPor || ''}"`,
      `"${op.entidadConvocante || op.empresaRazonSocial || ''}"`,
      `"${op.empresaRuc || ''}"`,
      `"${op.acuerdoMarco?.codigo || ''}"`,
      `"${op.marcas.map((m) => m.nombre).join(', ')}"`,
      `"${op.fechaVencimiento || ''}"`,
      `"${op.fechaRegistro || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Resolucion_Oportunidades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="res-page">
      {/* ── Encabezado Principal ── */}
      <div className="res-header">
        <div className="res-header__info">
          <div className="res-header__icon-box">
            <GoogleIcon name="gavel" size={26} color="#2563eb" />
          </div>
          <div className="res-header__title-area">
            <h1>Resolución de Oportunidades y Licitaciones</h1>
            <p>
              Dictamina formalmente el resultado de las licitaciones públicas registradas por el equipo comercial de Perú Compras.
            </p>
          </div>
        </div>

        <div className="res-header__actions">
          <button
            type="button"
            className="res-btn-sync"
            onClick={cargarOportunidades}
            disabled={loading}
            title="Recargar datos de la base de datos"
          >
            <GoogleIcon name={loading ? 'sync' : 'refresh'} size={18} color="#334155" />
            <span>{loading ? 'Cargando...' : 'Sincronizar'}</span>
          </button>
          <button type="button" className="res-btn-export" onClick={exportarCSV}>
            <GoogleIcon name="download" size={18} color="#2563eb" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ── VISTA 1: BANDEJA GENERAL (TABLA CON FILTROS Y KPIS) ── */}
      {activeMainTab === 'bandeja' && (
        <>
          {/* ── KPIs Strip ── */}
          <div className="res-kpis">
            <div className="res-kpi-card res-kpi-card--pending">
              <div className="res-kpi-card__icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <GoogleIcon name="hourglass_top" size={24} color="#d97706" />
              </div>
              <div className="res-kpi-card__data">
                <span className="res-kpi-card__val">{kpis.pendientesCount}</span>
                <span className="res-kpi-card__label">Pendientes por Resolver</span>
                <span className="res-kpi-card__sub">En Licitación y Cotizadas</span>
              </div>
            </div>

            <div className="res-kpi-card res-kpi-card--awarded">
              <div className="res-kpi-card__icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <GoogleIcon name="verified" size={24} color="#059669" />
              </div>
              <div className="res-kpi-card__data">
                <span className="res-kpi-card__val">{kpis.adjudicadasCount}</span>
                <span className="res-kpi-card__label">Adjudicadas (Ganadas)</span>
                <span className="res-kpi-card__sub">
                  S/ {kpis.adjudicadasMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="res-kpi-card res-kpi-card--dismissed">
              <div className="res-kpi-card__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <GoogleIcon name="cancel" size={24} color="#dc2626" />
              </div>
              <div className="res-kpi-card__data">
                <span className="res-kpi-card__val">{kpis.desestimadasCount}</span>
                <span className="res-kpi-card__label">Desestimadas</span>
                <span className="res-kpi-card__sub">No adjudicadas / Canceladas</span>
              </div>
            </div>

            <div className="res-kpi-card res-kpi-card--urgent">
              <div className="res-kpi-card__icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                <GoogleIcon name="alarm" size={24} color="#7c3aed" />
              </div>
              <div className="res-kpi-card__data">
                <span className="res-kpi-card__val">{kpis.urgentesCount}</span>
                <span className="res-kpi-card__label">Atención Urgente</span>
                <span className="res-kpi-card__sub">Vencidas o vencen hoy</span>
              </div>
            </div>
          </div>

          {/* ── Panel Principal con Tabla ── */}
          <div className="res-card">
            {/* Pestañas de Estado */}
            <div className="res-tabs">
              <button
                type="button"
                className={`res-tab-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
                onClick={() => setActiveTab('pendientes')}
              >
                <GoogleIcon name="hourglass_top" size={16} color={activeTab === 'pendientes' ? '#2563eb' : '#64748b'} />
                <span>Pendientes por Resolver</span>
                <span className="res-tab-badge">{kpis.pendientesCount}</span>
              </button>

              <button
                type="button"
                className={`res-tab-btn ${activeTab === 'adjudicadas' ? 'active' : ''}`}
                onClick={() => setActiveTab('adjudicadas')}
              >
                <GoogleIcon name="verified" size={16} color={activeTab === 'adjudicadas' ? '#059669' : '#64748b'} />
                <span>Adjudicadas</span>
                <span className="res-tab-badge">{kpis.adjudicadasCount}</span>
              </button>

              <button
                type="button"
                className={`res-tab-btn ${activeTab === 'desestimadas' ? 'active' : ''}`}
                onClick={() => setActiveTab('desestimadas')}
              >
                <GoogleIcon name="cancel" size={16} color={activeTab === 'desestimadas' ? '#dc2626' : '#64748b'} />
                <span>Desestimadas</span>
                <span className="res-tab-badge">{kpis.desestimadasCount}</span>
              </button>

              <button
                type="button"
                className={`res-tab-btn ${activeTab === 'cotizadas' ? 'active' : ''}`}
                onClick={() => setActiveTab('cotizadas')}
              >
                <GoogleIcon name="description" size={16} color={activeTab === 'cotizadas' ? '#0284c7' : '#64748b'} />
                <span>Cotizadas</span>
              </button>

              <button
                type="button"
                className={`res-tab-btn ${activeTab === 'en-licitacion' ? 'active' : ''}`}
                onClick={() => setActiveTab('en-licitacion')}
              >
                <GoogleIcon name="bolt" size={16} color={activeTab === 'en-licitacion' ? '#d97706' : '#64748b'} />
                <span>En Licitación</span>
              </button>

              <button
                type="button"
                className={`res-tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
                onClick={() => setActiveTab('todos')}
              >
                <span>Todos los Registros</span>
                <span className="res-tab-badge">{kpis.total}</span>
              </button>
            </div>

            {/* Toolbar con buscador y filtros */}
            <div className="res-toolbar">
              <div className="res-search">
                <GoogleIcon name="search" size={18} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Buscar por requerimiento, entidad, empresa, marca, ejecutiva..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
                  >
                    <GoogleIcon name="close" size={16} color="#94a3b8" />
                  </button>
                )}
              </div>

              <div className="res-filters-group">
                {/* Filtro Ejecutiva */}
                <select
                  className="res-select"
                  value={filtroEjecutiva}
                  onChange={(e) => setFiltroEjecutiva(e.target.value)}
                  title="Filtrar por ejecutiva"
                >
                  <option value="todos">Todas las Ejecutivas</option>
                  {listaEjecutivas.map((ej) => (
                    <option key={ej} value={ej}>
                      {ej}
                    </option>
                  ))}
                </select>

                {/* Filtro Acuerdo Marco */}
                <select
                  className="res-select"
                  value={filtroAcuerdo}
                  onChange={(e) => setFiltroAcuerdo(e.target.value)}
                  title="Filtrar por acuerdo marco"
                >
                  <option value="todos">Todos los Acuerdos</option>
                  {listaAcuerdos.map((ac) => (
                    <option key={ac} value={ac}>
                      {ac}
                    </option>
                  ))}
                </select>

                {/* Ordenamiento */}
                <select
                  className="res-select"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as any)}
                  title="Ordenar por"
                >
                  <option value="vencimiento">Próximos a Vencer</option>
                  <option value="recientes">Más Recientes</option>
                  <option value="monto">Mayor Monto</option>
                </select>
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="res-table-wrap">
              {loading ? (
                <div className="res-empty">
                  <div className="res-empty__icon" style={{ animation: 'spin 1.2s linear infinite' }}>
                    <GoogleIcon name="sync" size={30} color="#2563eb" />
                  </div>
                  <h3>Cargando oportunidades...</h3>
                  <p>Consultando la base de datos de licitaciones de Perú Compras.</p>
                </div>
              ) : oportunidadesFiltradas.length === 0 ? (
                <div className="res-empty">
                  <div className="res-empty__icon">
                    <GoogleIcon name="search_off" size={32} color="#94a3b8" />
                  </div>
                  <h3>No se encontraron oportunidades</h3>
                  <p>
                    {busqueda || filtroEjecutiva !== 'todos' || filtroAcuerdo !== 'todos'
                      ? 'Intenta ajustar los términos de búsqueda o los filtros aplicados.'
                      : 'No hay oportunidades registradas en esta vista.'}
                  </p>
                </div>
              ) : (
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Requerimiento</th>
                      <th>Entidad / Empresa Solicitante</th>
                      <th>Acuerdo Marco</th>
                      <th>Marcas & Ítems</th>
                      <th>Límite Total</th>
                      <th>Vencimiento</th>
                      <th>Ejecutiva</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones de Resolución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oportunidadesFiltradas.map((op) => {
                      const badgeV = getVencimientoBadge(op.fechaVencimiento);
                      const st = ESTADO_BADGE_CONFIG[op.estado] || {
                        label: op.estado,
                        color: '#64748b',
                        bg: '#f1f5f9',
                        icon: 'help',
                      };
                      const reqKey = (op.numeroRequerimiento || '').trim().toUpperCase();
                      const cantConcurrente = concurrenciaPorReq.get(reqKey) || 1;

                      return (
                        <tr key={op.id}>
                          {/* Requerimiento */}
                          <td>
                            <div className="res-cell-req">
                              <span className="res-req-code">
                                <GoogleIcon name="description" size={16} color="#2563eb" />
                                {op.numeroRequerimiento}
                              </span>
                              {cantConcurrente > 1 && (
                                <button
                                  type="button"
                                  className="res-podio-chip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleIrAPodioResolver(op.numeroRequerimiento);
                                  }}
                                  title={`Competencia activa: ${cantConcurrente} ejecutivas registraron este requerimiento. Clic para ver Podio y Dictaminar.`}
                                >
                                  <GoogleIcon name="emoji_events" size={12} color="#b45309" />
                                  <span>Podio ({cantConcurrente})</span>
                                </button>
                              )}
                              <span className="res-req-time" title={`Fecha de registro: ${op.createdAt}`}>
                                <GoogleIcon name="schedule" size={13} color="#94a3b8" />
                                {op.horaRegistroExacta || op.createdAt || 'Registrado'}
                              </span>
                            </div>
                          </td>

                          {/* Entidad / Empresa */}
                          <td>
                            <div className="res-cell-entity">
                              <span
                                className="res-entity-name"
                                title={op.entidadConvocante || op.empresaRazonSocial || 'No asignada'}
                              >
                                {op.entidadConvocante || op.empresaRazonSocial || 'No asignada'}
                              </span>
                              {op.empresaRuc && <span className="res-entity-ruc">RUC: {op.empresaRuc}</span>}
                            </div>
                          </td>

                          {/* Acuerdo Marco */}
                          <td>
                            {op.acuerdoMarco ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                                  {op.acuerdoMarco.codigo}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '0.74rem',
                                    color: '#64748b',
                                    maxWidth: '170px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={op.acuerdoMarco.descripcion}
                                >
                                  {op.acuerdoMarco.descripcion}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sin Acuerdo</span>
                            )}
                          </td>

                          {/* Marcas & Ítems */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                {op.marcas.map((m) => m.nombre).join(', ') || 'Sin marca'}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                {op.items.length} {op.items.length === 1 ? 'ítem' : 'ítems'} (
                                {op.items.reduce((s, it) => s + (Number(it.cantidad) || 0), 0)} unids)
                              </span>
                            </div>
                          </td>

                          {/* Monto Límite */}
                          <td>
                            <span className="res-cell-amount">
                              S/{' '}
                              {Number(op.limiteTotal).toLocaleString('es-PE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>

                          {/* Vencimiento */}
                          <td>
                            {badgeV ? (
                              <span
                                className="res-badge-vencimiento"
                                style={{ color: badgeV.color, background: badgeV.bg }}
                              >
                                <GoogleIcon name="alarm" size={13} color={badgeV.color} />
                                {badgeV.label}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No fijado</span>
                            )}
                          </td>

                          {/* Ejecutiva */}
                          <td>
                            <div className="res-user-chip" title={op.creadoPor}>
                              <div className="res-user-avatar">
                                {(op.creadoPor || 'E').charAt(0).toUpperCase()}
                              </div>
                              <span>{op.creadoPor || 'Ejecutiva'}</span>
                            </div>
                          </td>

                          {/* Estado */}
                          <td>
                            <span className="res-badge-status" style={{ color: st.color, background: st.bg }}>
                              <GoogleIcon name={st.icon} size={14} color={st.color} />
                              {st.label}
                            </span>
                          </td>

                          {/* Acciones de Resolución */}
                          <td>
                            <div className="res-actions-cell" style={{ justifyContent: 'center' }}>
                              {/* Botón Resolver / Podio */}
                              <button
                                type="button"
                                className="res-btn-podio"
                                onClick={() => handleIrAPodioResolver(op.numeroRequerimiento)}
                                title="Ver Podio de Competencia y Dictaminar Veredicto"
                              >
                                <GoogleIcon name="gavel" size={15} color="#b45309" />
                                <span>Resolver</span>
                              </button>

                              {/* Botón Adjudicar (si no está ya adjudicada) */}
                              {op.estado !== 'Adjudicada' && !['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado) && (
                                <button
                                  type="button"
                                  className="res-btn-adjudicar"
                                  onClick={() => {
                                    setAdjudicarModalOp(op);
                                    setAdjudicarNotas('');
                                  }}
                                  title="Dictaminar Buena Pro / Adjudicar Oportunidad"
                                >
                                  <GoogleIcon name="verified" size={15} color="#ffffff" />
                                  <span>Adjudicar</span>
                                </button>
                              )}

                              {/* Botón Desestimar (si no está ya desestimada) */}
                              {op.estado !== 'Desestimada' && op.estado !== 'OC_RECHAZADA' && (
                                <button
                                  type="button"
                                  className="res-btn-desestimar"
                                  onClick={() => {
                                    setDesestimarModalOp(op);
                                    setDesestimarMotivo('Precio no competitivo');
                                    setDesestimarObservacion('');
                                  }}
                                  title="Desestimar / Cancelar Oportunidad"
                                >
                                  <GoogleIcon name="cancel" size={15} color="#dc2626" />
                                  <span>Desestimar</span>
                                </button>
                              )}

                              {/* Botón Más Acciones */}
                              <div style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  className="res-btn-more"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuAbiertoId((prev) => (prev === op.id ? null : op.id));
                                  }}
                                  title="Más opciones de resolución"
                                >
                                  <GoogleIcon name="more_vert" size={18} color="#475569" />
                                </button>

                                {menuAbiertoId === op.id && (
                                  <div className="res-menu-popover" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="res-menu-item"
                                      onClick={() => {
                                        setDetalleModalOp(op);
                                        setMenuAbiertoId(null);
                                      }}
                                    >
                                      <GoogleIcon name="visibility" size={16} color="#0284c7" />
                                      <span>Ver Detalle Completo</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="res-menu-item"
                                      onClick={() => {
                                        setMenuAbiertoId(null);
                                        setPodioModalReq(op.numeroRequerimiento);
                                      }}
                                    >
                                      <GoogleIcon name="emoji_events" size={16} color="#d97706" />
                                      <span>Ver Podio y Asignar Ganador</span>
                                    </button>

                                    {op.estado === 'En Licitación' && (
                                      <button
                                        type="button"
                                        className="res-menu-item"
                                        onClick={() => {
                                          setMenuAbiertoId(null);
                                          resolverEstado(
                                            op,
                                            'Cotizada',
                                            `El requerimiento "${op.numeroRequerimiento}" fue marcado como COTIZADO.`
                                          );
                                        }}
                                      >
                                        <GoogleIcon name="description" size={16} color="#2563eb" />
                                        <span>Marcar como Cotizada</span>
                                      </button>
                                    )}

                                    {(op.estado === 'Desestimada' || op.estado === 'Adjudicada') && (
                                      <button
                                        type="button"
                                        className="res-menu-item"
                                        onClick={() => {
                                          setMenuAbiertoId(null);
                                          resolverEstado(
                                            op,
                                            'En Licitación',
                                            `El requerimiento "${op.numeroRequerimiento}" fue reabierto y devuelto a EN LICITACIÓN.`
                                          );
                                        }}
                                      >
                                        <GoogleIcon name="replay" size={16} color="#d97706" />
                                        <span>Reabrir a Licitación</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── VISTA 2: RESOLVER (PODIO POR REQUERIMIENTO Y VEREDICTO DE LA ADMINISTRADORA) ── */}
      {activeMainTab === 'resolver' && (
        <div className="res-resolver-container">
          {/* Selector y Filtros de Requerimiento */}
          <div className="res-selector-box">
            <div className="res-selector-header">
              <div className="res-selector-title">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <GoogleIcon name="military_tech" size={24} color="#2563eb" />
                </div>
                <div>
                  <h3>Podio Oficial de Oportunidades por Requerimiento</h3>
                  <p>Evalúa el orden de llegada cronológico (1° al 5° lugar) y emite el dictamen oficial de adjudicación.</p>
                </div>
              </div>

              <div className="res-selector-controls">
                <div className="res-selector-search">
                  <div className="res-selector-search-icon">
                    <GoogleIcon name="search" size={18} color="#94a3b8" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por N° RQ, entidad o ejecutiva..."
                    value={busquedaReq}
                    onChange={(e) => setBusquedaReq(e.target.value)}
                  />
                </div>

                <select
                  className="res-selector-dropdown"
                  value={selectedReq}
                  onChange={(e) => setSelectedReq(e.target.value)}
                >
                  <option value="todos">📋 Ver Todos los Requerimientos ({requerimientosInfo.length})</option>
                  {requerimientosInfo.map((r) => {
                    const tag = r.tieneGanador
                      ? ' [CON BUENA PRO]'
                      : r.esDisputado
                      ? ` [EN DISPUTA (${r.count})]`
                      : ' [1 POSTULACIÓN]';
                    return (
                      <option key={r.req} value={r.req}>
                        {r.req} — {r.count} {r.count === 1 ? 'ejecutiva' : 'ejecutivas'}{tag}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Píldoras de Filtro Rápido */}
            <div className="res-pills-row">
              <button
                type="button"
                className={`res-pill-btn ${filtroTipoReq === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltroTipoReq('todos')}
              >
                <span>Todos los Requerimientos</span>
                <span className="res-pill-badge">{requerimientosInfo.length}</span>
              </button>

              <button
                type="button"
                className={`res-pill-btn ${filtroTipoReq === 'disputados' ? 'active' : ''}`}
                onClick={() => setFiltroTipoReq('disputados')}
              >
                <GoogleIcon name="bolt" size={15} color={filtroTipoReq === 'disputados' ? '#ffffff' : '#d97706'} />
                <span>En Disputa (2+ Ejecutivas)</span>
                <span className="res-pill-badge">
                  {requerimientosInfo.filter((r) => r.esDisputado).length}
                </span>
              </button>

              <button
                type="button"
                className={`res-pill-btn ${filtroTipoReq === 'pendientes' ? 'active' : ''}`}
                onClick={() => setFiltroTipoReq('pendientes')}
              >
                <GoogleIcon name="hourglass_top" size={15} color={filtroTipoReq === 'pendientes' ? '#ffffff' : '#2563eb'} />
                <span>Pendientes de Resolver</span>
                <span className="res-pill-badge">
                  {requerimientosInfo.filter((r) => r.estaPendiente).length}
                </span>
              </button>

              <button
                type="button"
                className={`res-pill-btn ${filtroTipoReq === 'resueltos' ? 'active' : ''}`}
                onClick={() => setFiltroTipoReq('resueltos')}
              >
                <GoogleIcon name="verified" size={15} color={filtroTipoReq === 'resueltos' ? '#ffffff' : '#059669'} />
                <span>Con Buena Pro Asignada</span>
                <span className="res-pill-badge">
                  {requerimientosInfo.filter((r) => r.tieneGanador).length}
                </span>
              </button>
            </div>
          </div>

          {/* VISTA A: Si hay un Requerimiento Seleccionado -> Renderizar Podio y Lista de Veredicto */}
          {selectedReq !== 'todos' && podioReqData ? (
            <>
              {/* Banner Informativo del RQ Seleccionado */}
              <div className="res-req-banner">
                <div className="res-req-banner__left">
                  <div className="res-req-banner__icon">
                    <GoogleIcon name="emoji_events" size={26} color="#2563eb" />
                  </div>
                  <div className="res-req-banner__titles">
                    <h2>
                      <span>{podioReqData.reqItem.req}</span>
                      {podioReqData.reqItem.tieneGanador ? (
                        <span style={{ fontSize: '0.78rem', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                          ✓ Adjudicada / Resuelta
                        </span>
                      ) : podioReqData.reqItem.esDisputado ? (
                        <span style={{ fontSize: '0.78rem', background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 20, border: '1px solid #fde68a' }}>
                          ⚡ {podioReqData.reqItem.count} Ejecutivas en Disputa
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
                          Postulación Única
                        </span>
                      )}
                    </h2>
                    <div className="res-req-banner__meta">
                      <span><strong>Entidad:</strong> {podioReqData.reqItem.entidad}</span>
                      <span>&bull;</span>
                      <span><strong>Acuerdo Marco:</strong> {podioReqData.reqItem.acuerdo}</span>
                      <span>&bull;</span>
                      <span>
                        <strong>Límite Total:</strong>{' '}
                        <span style={{ color: '#059669', fontWeight: 800 }}>
                          S/ {podioReqData.reqItem.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="res-req-banner__right">
                  {podioReqData.reqItem.tieneGanador && (
                    <button
                      type="button"
                      className="res-btn-reabrir-licitacion"
                      onClick={() => handleReabrirLicitacion(podioReqData.reqItem.req)}
                      disabled={procesandoResolucion}
                      title="Anular la Buena Pro y reabrir el requerimiento para permitir un nuevo dictamen"
                    >
                      <GoogleIcon name="replay" size={17} color="#b45309" />
                      <span>Reabrir Licitación</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="res-btn-back-dir"
                    onClick={() => setSelectedReq('todos')}
                  >
                    <GoogleIcon name="grid_view" size={17} color="#475569" />
                    <span>Ver Directorio de Requerimientos</span>
                  </button>
                </div>
              </div>

              {/* ── Podio Visual de 5 Pedestales ── */}
              <div className="reg-podium-visual reg-podium-5">
                {/* 4to Lugar */}
                {podioReqData.top4 && (
                  <div className="reg-podium-slot slot-fourth">
                    {podioReqData.top4.esGanador && <div className="reg-podium-crown">👑</div>}
                    <div className="reg-podium-medal">
                      {podioReqData.top4.posicion === 1 ? '🥇' : podioReqData.top4.posicion === 2 ? '🥈' : podioReqData.top4.posicion === 3 ? '🥉' : '🎖️'}
                    </div>
                    <div className="reg-podium-avatar">
                      <span>{podioReqData.top4.nombre.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="reg-podium-name" title={podioReqData.top4.nombre}>
                      {podioReqData.top4.nombre}
                    </div>
                    <div className="reg-podium-amount">
                      S/ {Number(podioReqData.top4.op.limiteTotal || 0).toLocaleString('es-PE')}
                    </div>
                    <div className="reg-podium-stats">
                      <span className={`reg-podium-timing-badge ${podioReqData.top4.esLiderLlegada ? 'timing-gold' : 'timing-delta'}`}>
                        {podioReqData.top4.diferenciaTexto}
                      </span>
                    </div>

                    {/* Veredicto Action */}
                    {podioReqData.top4.esGanador ? (
                      <div className="res-pod-winner-tag">👑 Buena Pro Asignada</div>
                    ) : podioReqData.reqItem.tieneGanador ? (
                      <div className="res-pod-locked-tag" title="Puesto bloqueado: La Buena Pro ya fue adjudicada para este requerimiento.">
                        <GoogleIcon name="lock" size={12} color="#64748b" />
                        <span>Bloqueado</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="res-pod-btn-veredicto"
                        onClick={() => handleAsignarGanador(podioReqData.top4!.op)}
                        disabled={procesandoResolucion}
                      >
                        <GoogleIcon name="emoji_events" size={13} color="#ffffff" />
                        <span>Asignar</span>
                      </button>
                    )}

                    {/* Botón Ver Detalle de la Oportunidad con SVG de Ojo */}
                    <button
                      type="button"
                      className="res-pod-btn-ver-detalle"
                      onClick={() => setDetalleModalOp(podioReqData.top4!.op)}
                      title="Ver detalle de la oportunidad registrada"
                    >
                      {SVG_EYE_ICON}
                      <span>Ver Oportunidad</span>
                    </button>

                    <div className="reg-pedestal pedestal-4">
                      <span className="pedestal-num">{podioReqData.top4.posicion}</span>
                      <span className="pedestal-label">
                        {podioReqData.top4.hayEmpate ? 'EMPATE TÉCNICO' : '4TO LUGAR'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2do Lugar (Plata) */}
                {podioReqData.top2 && (
                  <div className="reg-podium-slot slot-second">
                    {podioReqData.top2.esGanador && <div className="reg-podium-crown">👑</div>}
                    <div className="reg-podium-medal">{podioReqData.top2.posicion === 1 ? '🥇' : '🥈'}</div>
                    <div className="reg-podium-avatar">
                      <span>{podioReqData.top2.nombre.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="reg-podium-name" title={podioReqData.top2.nombre}>
                      {podioReqData.top2.nombre}
                    </div>
                    <div className="reg-podium-amount">
                      S/ {Number(podioReqData.top2.op.limiteTotal || 0).toLocaleString('es-PE')}
                    </div>
                    <div className="reg-podium-stats">
                      <span className={`reg-podium-timing-badge ${podioReqData.top2.esLiderLlegada ? 'timing-gold' : 'timing-delta'}`}>
                        {podioReqData.top2.diferenciaTexto}
                      </span>
                    </div>

                    {/* Veredicto Action */}
                    {podioReqData.top2.esGanador ? (
                      <div className="res-pod-winner-tag">👑 Buena Pro Asignada</div>
                    ) : podioReqData.reqItem.tieneGanador ? (
                      <div className="res-pod-locked-tag" title="Puesto bloqueado: La Buena Pro ya fue adjudicada para este requerimiento.">
                        <GoogleIcon name="lock" size={12} color="#64748b" />
                        <span>Bloqueado</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="res-pod-btn-veredicto"
                        onClick={() => handleAsignarGanador(podioReqData.top2!.op)}
                        disabled={procesandoResolucion}
                      >
                        <GoogleIcon name="emoji_events" size={13} color="#ffffff" />
                        <span>Asignar</span>
                      </button>
                    )}

                    {/* Botón Ver Detalle de la Oportunidad con SVG de Ojo */}
                    <button
                      type="button"
                      className="res-pod-btn-ver-detalle"
                      onClick={() => setDetalleModalOp(podioReqData.top2!.op)}
                      title="Ver detalle de la oportunidad registrada"
                    >
                      {SVG_EYE_ICON}
                      <span>Ver Oportunidad</span>
                    </button>

                    <div className="reg-pedestal pedestal-2">
                      <span className="pedestal-num">{podioReqData.top2.posicion}</span>
                      <span className="pedestal-label">
                        {podioReqData.top2.hayEmpate ? 'EMPATE TÉCNICO' : '2DO LUGAR'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 1er Lugar (Oro - Líder de Llegada) */}
                {podioReqData.top1 && (
                  <div className="reg-podium-slot slot-first">
                    <div className="reg-podium-crown">👑</div>
                    <div className="reg-podium-medal">🥇</div>
                    <div className="reg-podium-avatar">
                      <span>{podioReqData.top1.nombre.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="reg-podium-name" title={podioReqData.top1.nombre}>
                      {podioReqData.top1.nombre}
                    </div>
                    <div className="reg-podium-amount gold-text">
                      S/ {Number(podioReqData.top1.op.limiteTotal || 0).toLocaleString('es-PE')}
                    </div>
                    <div className="reg-podium-stats">
                      <span className="reg-podium-timing-badge timing-gold">
                        {podioReqData.top1.horaRegistro ? `⚡ ${podioReqData.top1.diferenciaTexto} (${podioReqData.top1.horaRegistro})` : podioReqData.top1.diferenciaTexto}
                      </span>
                    </div>

                    {/* Veredicto Action */}
                    {podioReqData.top1.esGanador ? (
                      <div className="res-pod-winner-tag">👑 Ganador Buena Pro</div>
                    ) : podioReqData.reqItem.tieneGanador ? (
                      <div className="res-pod-locked-tag" title="Puesto bloqueado: La Buena Pro ya fue adjudicada para este requerimiento.">
                        <GoogleIcon name="lock" size={12} color="#64748b" />
                        <span>Bloqueado</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="res-pod-btn-veredicto"
                        style={{ background: '#d97706', padding: '5px 12px' }}
                        onClick={() => handleAsignarGanador(podioReqData.top1!.op)}
                        disabled={procesandoResolucion}
                      >
                        <GoogleIcon name="emoji_events" size={14} color="#ffffff" />
                        <span>Asignar Buena Pro</span>
                      </button>
                    )}

                    {/* Botón Ver Detalle de la Oportunidad con SVG de Ojo */}
                    <button
                      type="button"
                      className="res-pod-btn-ver-detalle"
                      onClick={() => setDetalleModalOp(podioReqData.top1!.op)}
                      title="Ver detalle de la oportunidad registrada"
                    >
                      {SVG_EYE_ICON}
                      <span>Ver Oportunidad</span>
                    </button>

                    <div className="reg-pedestal pedestal-1">
                      <span className="pedestal-num">1</span>
                      <span className="pedestal-label">
                        {podioReqData.top1.esGanador ? 'BUENA PRO GANADA' : '1ER LUGAR (LLEGÓ PRIMERO)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3er Lugar (Bronce) */}
                {podioReqData.top3 && (
                  <div className="reg-podium-slot slot-third">
                    {podioReqData.top3.esGanador && <div className="reg-podium-crown">👑</div>}
                    <div className="reg-podium-medal">
                      {podioReqData.top3.posicion === 1 ? '🥇' : podioReqData.top3.posicion === 2 ? '🥈' : '🥉'}
                    </div>
                    <div className="reg-podium-avatar">
                      <span>{podioReqData.top3.nombre.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="reg-podium-name" title={podioReqData.top3.nombre}>
                      {podioReqData.top3.nombre}
                    </div>
                    <div className="reg-podium-amount">
                      S/ {Number(podioReqData.top3.op.limiteTotal || 0).toLocaleString('es-PE')}
                    </div>
                    <div className="reg-podium-stats">
                      <span className={`reg-podium-timing-badge ${podioReqData.top3.esLiderLlegada ? 'timing-gold' : 'timing-delta'}`}>
                        {podioReqData.top3.diferenciaTexto}
                      </span>
                    </div>

                    {/* Veredicto Action */}
                    {podioReqData.top3.esGanador ? (
                      <div className="res-pod-winner-tag">👑 Buena Pro Asignada</div>
                    ) : podioReqData.reqItem.tieneGanador ? (
                      <div className="res-pod-locked-tag" title="Puesto bloqueado: La Buena Pro ya fue adjudicada para este requerimiento.">
                        <GoogleIcon name="lock" size={12} color="#64748b" />
                        <span>Bloqueado</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="res-pod-btn-veredicto"
                        onClick={() => handleAsignarGanador(podioReqData.top3!.op)}
                        disabled={procesandoResolucion}
                      >
                        <GoogleIcon name="emoji_events" size={13} color="#ffffff" />
                        <span>Asignar</span>
                      </button>
                    )}

                    {/* Botón Ver Detalle de la Oportunidad con SVG de Ojo */}
                    <button
                      type="button"
                      className="res-pod-btn-ver-detalle"
                      onClick={() => setDetalleModalOp(podioReqData.top3!.op)}
                      title="Ver detalle de la oportunidad registrada"
                    >
                      {SVG_EYE_ICON}
                      <span>Ver Oportunidad</span>
                    </button>

                    <div className="reg-pedestal pedestal-3">
                      <span className="pedestal-num">{podioReqData.top3.posicion}</span>
                      <span className="pedestal-label">
                        {podioReqData.top3.hayEmpate ? 'EMPATE TÉCNICO' : '3ER LUGAR'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 5to Lugar */}
                {podioReqData.top5 && (
                  <div className="reg-podium-slot slot-fifth">
                    {podioReqData.top5.esGanador && <div className="reg-podium-crown">👑</div>}
                    <div className="reg-podium-medal">🎖️</div>
                    <div className="reg-podium-avatar">
                      <span>{podioReqData.top5.nombre.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="reg-podium-name" title={podioReqData.top5.nombre}>
                      {podioReqData.top5.nombre}
                    </div>
                    <div className="reg-podium-amount">
                      S/ {Number(podioReqData.top5.op.limiteTotal || 0).toLocaleString('es-PE')}
                    </div>
                    <div className="reg-podium-stats">
                      <span className={`reg-podium-timing-badge ${podioReqData.top5.esLiderLlegada ? 'timing-gold' : 'timing-delta'}`}>
                        {podioReqData.top5.diferenciaTexto}
                      </span>
                    </div>

                    {/* Veredicto Action */}
                    {podioReqData.top5.esGanador ? (
                      <div className="res-pod-winner-tag">👑 Buena Pro Asignada</div>
                    ) : podioReqData.reqItem.tieneGanador ? (
                      <div className="res-pod-locked-tag" title="Puesto bloqueado: La Buena Pro ya fue adjudicada para este requerimiento.">
                        <GoogleIcon name="lock" size={12} color="#64748b" />
                        <span>Bloqueado</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="res-pod-btn-veredicto"
                        onClick={() => handleAsignarGanador(podioReqData.top5!.op)}
                        disabled={procesandoResolucion}
                      >
                        <GoogleIcon name="emoji_events" size={13} color="#ffffff" />
                        <span>Asignar</span>
                      </button>
                    )}

                    {/* Botón Ver Detalle de la Oportunidad con SVG de Ojo */}
                    <button
                      type="button"
                      className="res-pod-btn-ver-detalle"
                      onClick={() => setDetalleModalOp(podioReqData.top5!.op)}
                      title="Ver detalle de la oportunidad registrada"
                    >
                      {SVG_EYE_ICON}
                      <span>Ver Oportunidad</span>
                    </button>

                    <div className="reg-pedestal pedestal-5">
                      <span className="pedestal-num">{podioReqData.top5.posicion}</span>
                      <span className="pedestal-label">
                        {podioReqData.top5.hayEmpate ? 'EMPATE TÉCNICO' : '5TO LUGAR'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* VISTA B: Directorio de Requerimientos (Grid con Tarjetas) */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>
                  Directorio de Requerimientos ({requerimientosFiltrados.length})
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Haz clic en un requerimiento para ver su podio y emitir el dictamen
                </span>
              </div>

              {requerimientosFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <GoogleIcon name="search_off" size={42} color="#94a3b8" />
                  <h4 style={{ margin: '12px 0 4px', color: '#1e293b', fontWeight: 800 }}>No se encontraron requerimientos</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                    Prueba cambiando el filtro de búsqueda o seleccionando otra píldora.
                  </p>
                </div>
              ) : (
                <div className="res-req-grid">
                  {requerimientosFiltrados.map((r) => (
                    <div
                      key={r.req}
                      className={`res-req-card ${r.tieneGanador ? 'res-req-card--adjudicado' : r.esDisputado ? 'res-req-card--disputado' : ''}`}
                      onClick={() => handleIrAPodioResolver(r.req)}
                    >
                      <div className="res-req-card__header">
                        <span className="res-req-card__code">
                          <GoogleIcon name="description" size={18} color="#2563eb" />
                          <span>{r.req}</span>
                        </span>
                        <span
                          className={`res-req-card__concurrencia ${r.count > 1 ? 'res-req-card__concurrencia--high' : 'res-req-card__concurrencia--single'}`}
                        >
                          <GoogleIcon name={r.count > 1 ? 'bolt' : 'person'} size={13} color="currentColor" />
                          <span>{r.count} {r.count === 1 ? 'ejecutiva' : 'ejecutivas'}</span>
                        </span>
                      </div>

                      <div className="res-req-card__body">
                        <div><strong>Entidad:</strong> {r.entidad}</div>
                        <div><strong>Acuerdo:</strong> {r.acuerdo}</div>
                        <div style={{ color: '#059669', fontWeight: 700 }}>
                          Límite: S/ {r.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {r.liderLlegada && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#475569' }}>
                            <GoogleIcon name="schedule" size={13} color="#94a3b8" />
                            <span>1° en llegar: <strong>{r.liderLlegada.creadoPor}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="res-req-card__footer">
                        {r.tieneGanador ? (
                          <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
                            👑 Buena Pro Asignada
                          </span>
                        ) : r.estaPendiente ? (
                          <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
                            ⏳ Pendiente de Resolver
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                            Desestimado / Cerrado
                          </span>
                        )}

                        <button
                          type="button"
                          className="res-btn-ver-podio-card"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIrAPodioResolver(r.req);
                          }}
                        >
                          <span>Ver Podio</span>
                          <GoogleIcon name="arrow_forward" size={14} color="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

          {/* ── Modal de Dictamen: ADJUDICAR OPORTUNIDAD ── */}
          {adjudicarModalOp && (
            <div className="res-modal-overlay">
              <div className="res-modal">
                <div className="res-modal__header">
                  <h3>
                    <GoogleIcon name="verified" size={22} color="#059669" />
                    <span>Dictaminar Adjudicación</span>
                  </h3>
                  <button
                    type="button"
                    className="res-modal__close-btn"
                    onClick={() => setAdjudicarModalOp(null)}
                  >
                    <GoogleIcon name="close" size={20} color="#64748b" />
                  </button>
                </div>

                <div className="res-modal__body">
                  <div className="res-modal__summary-box">
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Requerimiento:</span>
                      <span className="res-modal__summary-val" style={{ color: '#2563eb' }}>
                        {adjudicarModalOp.numeroRequerimiento}
                      </span>
                    </div>
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Entidad / Cliente:</span>
                      <span className="res-modal__summary-val">
                        {adjudicarModalOp.entidadConvocante || adjudicarModalOp.empresaRazonSocial || 'N/A'}
                      </span>
                    </div>
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Límite Total:</span>
                      <span className="res-modal__summary-val" style={{ color: '#059669', fontSize: '1rem' }}>
                        S/{' '}
                        {Number(adjudicarModalOp.limiteTotal).toLocaleString('es-PE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Ejecutiva Responsable:</span>
                      <span className="res-modal__summary-val">{adjudicarModalOp.creadoPor}</span>
                    </div>
                  </div>

                  <div className="res-modal__field">
                    <label>Notas de Resolución / Número de Buena Pro (Opcional):</label>
                    <textarea
                      placeholder="Ej: Buena Pro otorgada en portal Perú Compras. En espera de emisión formal de Orden de Compra..."
                      value={adjudicarNotas}
                      onChange={(e) => setAdjudicarNotas(e.target.value)}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <GoogleIcon name="info" size={16} color="#059669" />
                    <span>
                      Al adjudicar, la oportunidad se marcará como <strong>Adjudicada</strong> y quedará lista para el
                      registro de la Orden de Compra (OC).
                    </span>
                  </div>
                </div>

                <div className="res-modal__footer">
                  <button
                    type="button"
                    className="res-btn-cancel"
                    onClick={() => setAdjudicarModalOp(null)}
                    disabled={procesandoResolucion}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="res-btn-confirm"
                    style={{ background: '#059669' }}
                    onClick={handleConfirmarAdjudicar}
                    disabled={procesandoResolucion}
                  >
                    <GoogleIcon name="verified" size={16} color="#ffffff" />
                    <span>{procesandoResolucion ? 'Dictaminando...' : 'Confirmar Adjudicación'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal de Dictamen: DESESTIMAR OPORTUNIDAD ── */}
          {desestimarModalOp && (
            <div className="res-modal-overlay">
              <div className="res-modal">
                <div className="res-modal__header">
                  <h3>
                    <GoogleIcon name="cancel" size={22} color="#dc2626" />
                    <span>Dictaminar Desestimación</span>
                  </h3>
                  <button
                    type="button"
                    className="res-modal__close-btn"
                    onClick={() => setDesestimarModalOp(null)}
                  >
                    <GoogleIcon name="close" size={20} color="#64748b" />
                  </button>
                </div>

                <div className="res-modal__body">
                  <div className="res-modal__summary-box">
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Requerimiento:</span>
                      <span className="res-modal__summary-val" style={{ color: '#2563eb' }}>
                        {desestimarModalOp.numeroRequerimiento}
                      </span>
                    </div>
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Entidad:</span>
                      <span className="res-modal__summary-val">
                        {desestimarModalOp.entidadConvocante || desestimarModalOp.empresaRazonSocial || 'N/A'}
                      </span>
                    </div>
                    <div className="res-modal__summary-row">
                      <span className="res-modal__summary-label">Ejecutiva:</span>
                      <span className="res-modal__summary-val">{desestimarModalOp.creadoPor}</span>
                    </div>
                  </div>

                  <div className="res-modal__field">
                    <label>Motivo Principal de Desestimación:</label>
                    <select
                      value={desestimarMotivo}
                      onChange={(e) => setDesestimarMotivo(e.target.value)}
                    >
                      <option value="Precio no competitivo / Fuera de límite">Precio no competitivo / Fuera de límite</option>
                      <option value="No cumple especificaciones técnicas">No cumple especificaciones técnicas</option>
                      <option value="Cancelado o declarado desierto por la entidad">Cancelado o declarado desierto por la entidad</option>
                      <option value="Plazo vencido sin cotizar">Plazo vencido sin cotizar</option>
                      <option value="Falta de stock con mayoristas/marcas">Falta de stock con mayoristas/marcas</option>
                      <option value="Otro motivo">Otro motivo</option>
                    </select>
                  </div>

                  <div className="res-modal__field">
                    <label>Observaciones Adicionales (Opcional):</label>
                    <textarea
                      placeholder="Detalla la razón por la que no se adjudicó este requerimiento..."
                      value={desestimarObservacion}
                      onChange={(e) => setDesestimarObservacion(e.target.value)}
                    />
                  </div>
                </div>

                <div className="res-modal__footer">
                  <button
                    type="button"
                    className="res-btn-cancel"
                    onClick={() => setDesestimarModalOp(null)}
                    disabled={procesandoResolucion}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="res-btn-confirm"
                    style={{ background: '#dc2626' }}
                    onClick={handleConfirmarDesestimar}
                    disabled={procesandoResolucion}
                  >
                    <GoogleIcon name="cancel" size={16} color="#ffffff" />
                    <span>{procesandoResolucion ? 'Desestimando...' : 'Confirmar Desestimación'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal de Detalle Completo ── */}
          {detalleModalOp && (
            <DetalleOportunidadView
              oportunidad={detalleModalOp}
              todasOportunidades={oportunidades}
              roleAccent={roleAccent}
              onClose={() => setDetalleModalOp(null)}
              onEdit={() => { }}
              onSubirEvidencia={() => { }}
              onEstadoCambiado={(opActualizada) => {
                setOportunidades((prev) =>
                  prev.map((o) => (String(o.id) === String(opActualizada.id) ? opActualizada : o))
                );
                setDetalleModalOp(opActualizada);
              }}
              onOportunidadesActualizadas={(nuevas) => setOportunidades(nuevas)}
              getVencimientoBadge={getVencimientoBadge}
            />
          )}

          {/* ── Modal de Podio de la Oportunidad ── */}
          {podioModalReq && (
            <PodioRequerimientoModal
              numeroRequerimiento={podioModalReq}
              oportunidades={oportunidades}
              roleAccent={roleAccent}
              onClose={() => setPodioModalReq(null)}
              onOportunidadesActualizadas={(nuevas) => setOportunidades(nuevas)}
              onVerDetalle={(opSeleccionada) => {
                setPodioModalReq(null);
                setDetalleModalOp(opSeleccionada);
              }}
            />
          )}
        </div>
      );
};
      export default ResolverOportunidadesPage;
